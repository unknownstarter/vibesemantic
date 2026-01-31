"""
CSV Ingestion Service using Pandas
Handles large CSV files with chunk processing
"""

import io
import pandas as pd
from typing import Dict, List, Optional, Any
from supabase import Client
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Batch size for Supabase upserts
BATCH_SIZE = 1000

# File size threshold for chunk processing (MB)
CHUNK_SIZE_THRESHOLD_MB = 50
CHUNK_SIZE_ROWS = 10000


def download_csv_from_storage(
    supabase: Client,
    storage_path: str
) -> bytes:
    """
    Download CSV file from Supabase Storage
    
    Args:
        supabase: Supabase client
        storage_path: Path to file in storage bucket
        
    Returns:
        File content as bytes
        
    Raises:
        Exception: If download fails
    """
    try:
        response = supabase.storage.from_("csv-uploads").download(storage_path)
        if not response:
            raise Exception(f"Failed to download file: {storage_path}")
        return response
    except Exception as e:
        logger.error(f"Error downloading CSV from storage: {e}")
        raise


def _is_excel_filename(filename: Optional[str]) -> bool:
    if not filename:
        return False
    lower = filename.lower()
    return lower.endswith('.xlsx') or lower.endswith('.xls')


def parse_excel_with_pandas(
    file_content: bytes,
    original_filename: str
) -> pd.DataFrame:
    """
    Parse Excel file (.xlsx or .xls) using Pandas.
    First sheet only; returns DataFrame with same semantics as CSV for downstream transform.
    """
    import io
    try:
        lower = original_filename.lower()
        engine = 'openpyxl' if lower.endswith('.xlsx') else 'xlrd'
        df = pd.read_excel(
            io.BytesIO(file_content),
            sheet_name=0,
            engine=engine,
            header=0,
        )
        df = df.astype(str).replace('nan', '')
        logger.info(f"Parsed Excel: {len(df)} rows, {len(df.columns)} columns")
        return df
    except Exception as e:
        logger.error(f"Error parsing Excel with pandas: {e}")
        raise


def parse_csv_with_pandas(
    file_content: bytes,
    encoding: str = 'utf-8'
) -> pd.DataFrame:
    """
    Parse CSV file using Pandas
    
    Args:
        file_content: CSV file content as bytes
        encoding: File encoding (default: utf-8)
        
    Returns:
        Parsed DataFrame
        
    Raises:
        Exception: If parsing fails
    """
    try:
        # Try UTF-8 first
        try:
            content_str = file_content.decode(encoding)
        except UnicodeDecodeError:
            # Try common encodings
            for enc in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    content_str = file_content.decode(enc)
                    logger.info(f"Using encoding: {enc}")
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise Exception("Could not decode CSV file with common encodings")
        
        # Parse with pandas
        df = pd.read_csv(
            io.StringIO(content_str),
            encoding=encoding,
            on_bad_lines='skip',  # Skip malformed lines
            engine='c',  # Use C engine for speed
            low_memory=False  # Better type inference
        )
        
        logger.info(f"Parsed CSV: {len(df)} rows, {len(df.columns)} columns")
        return df
        
    except Exception as e:
        logger.error(f"Error parsing CSV with pandas: {e}")
        raise


def parse_csv_with_pandas_chunks(
    file_content: bytes,
    encoding: str = 'utf-8'
):
    """
    Parse CSV file using Pandas with chunk processing (generator)
    
    Args:
        file_content: CSV file content as bytes
        encoding: File encoding (default: utf-8)
        
    Yields:
        DataFrame chunks
        
    Raises:
        Exception: If parsing fails
    """
    try:
        # Decode content
        try:
            content_str = file_content.decode(encoding)
        except UnicodeDecodeError:
            for enc in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    content_str = file_content.decode(enc)
                    logger.info(f"Using encoding: {enc}")
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise Exception("Could not decode CSV file")
        
        # Parse in chunks
        chunk_reader = pd.read_csv(
            io.StringIO(content_str),
            encoding=encoding,
            chunksize=CHUNK_SIZE_ROWS,
            on_bad_lines='skip',
            engine='c',
            low_memory=False
        )
        
        for chunk_df in chunk_reader:
            logger.info(f"Processing chunk: {len(chunk_df)} rows")
            yield chunk_df
            
    except Exception as e:
        logger.error(f"Error parsing CSV with chunks: {e}")
        raise


def transform_dataframe_to_records(
    df: pd.DataFrame,
    headers: List[str],
    mapping: Dict[str, Any],
    project_id: str,
    dataset_id: str,
    date_range_filter: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    """
    Transform pandas DataFrame to mart_csv_daily_metrics records
    
    Args:
        df: Input DataFrame
        headers: Original CSV headers (to match column names)
        mapping: Source mapping configuration
        project_id: Project ID
        dataset_id: Dataset ID
        date_range_filter: Optional date range filter {start: str, end: str}
        
    Returns:
        List of records ready for Supabase upsert
    """
    records = []
    
    # Get column indices
    date_column = mapping.get('date_column')
    metric_columns = mapping.get('metric_columns', [])
    dimension_columns = mapping.get('dimension_columns', [])
    
    # Normalize column names (handle encoding issues)
    df_columns = {col: col for col in df.columns}
    # Try to match headers exactly
    for header in headers:
        if header in df.columns:
            continue
        # Try case-insensitive match
        for df_col in df.columns:
            if df_col.lower() == header.lower():
                df_columns[df_col] = header
                break
    
    # Get date column index
    date_col_index = None
    if date_column:
        for i, col in enumerate(df.columns):
            if col == date_column or df_columns.get(col) == date_column:
                date_col_index = i
                break
    
    # Default date for aggregate data (no date column)
    default_date = None
    if not date_column:
        default_date = datetime.now().strftime('%Y-%m-%d')
    
    # Process each row
    for idx, row in df.iterrows():
        # Parse date
        date_str = default_date
        if date_col_index is not None:
            date_val = row.iloc[date_col_index]
            if pd.notna(date_val):
                try:
                    # Try to parse as date
                    if isinstance(date_val, str):
                        date_str = normalize_date(date_val)
                    else:
                        date_str = pd.to_datetime(date_val).strftime('%Y-%m-%d')
                except:
                    date_str = default_date or datetime.now().strftime('%Y-%m-%d')
        
        # Apply date filter
        if date_range_filter and date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start = datetime.strptime(date_range_filter['start'], '%Y-%m-%d')
                end = datetime.strptime(date_range_filter['end'], '%Y-%m-%d')
                if date_obj < start or date_obj > end:
                    continue
            except:
                pass  # Skip filter if date parsing fails
        
        # Build dimensions
        dimensions = {}
        for dim in dimension_columns:
            dim_name = dim.get('name')
            if not dim_name:
                continue
            # Find column in DataFrame
            for col in df.columns:
                if col == dim_name or df_columns.get(col) == dim_name:
                    value = row[col]
                    if pd.notna(value):
                        dimensions[dim_name] = str(value).strip()
                    break
        
        # Primary dimension (legacy support)
        primary_dim_key = list(dimensions.keys())[0] if dimensions else None
        primary_dim_value = dimensions[primary_dim_key] if primary_dim_key else None
        
        # Build raw_data (all columns)
        raw_data = {}
        for col in df.columns:
            value = row[col]
            if pd.notna(value):
                raw_data[col] = value
        
        # Create one record per metric
        for metric in metric_columns:
            metric_name = metric.get('name')
            if not metric_name:
                continue
            
            # Find column in DataFrame
            metric_col = None
            for col in df.columns:
                if col == metric_name or df_columns.get(col) == metric_name:
                    metric_col = col
                    break
            
            if metric_col is None:
                continue
            
            # Parse numeric value
            raw_value = row[metric_col]
            if pd.isna(raw_value):
                numeric_value = None
            else:
                try:
                    # Remove currency symbols, commas, etc.
                    if isinstance(raw_value, str):
                        cleaned = raw_value.replace('$', '').replace(',', '').replace('%', '').strip()
                        numeric_value = float(cleaned)
                    else:
                        numeric_value = float(raw_value)
                except:
                    numeric_value = None
            
            # Create record
            record = {
                'project_id': project_id,
                'dataset_id': dataset_id,
                'date': date_str,
                'metric_name': metric_name,
                'metric_value': numeric_value,
                'dimension_key': primary_dim_key,
                'dimension_value': primary_dim_value,
                'dimensions': dimensions if dimensions else None,
                'raw_data': raw_data if raw_data else None,
            }
            
            records.append(record)
    
    return records


def normalize_date(date_str: str) -> str:
    """
    Normalize various date formats to YYYY-MM-DD
    
    Args:
        date_str: Date string in various formats
        
    Returns:
        Normalized date string (YYYY-MM-DD)
    """
    if not date_str or pd.isna(date_str):
        return datetime.now().strftime('%Y-%m-%d')
    
    date_str = str(date_str).strip()
    
    # Try pandas to_datetime (handles many formats)
    try:
        dt = pd.to_datetime(date_str)
        return dt.strftime('%Y-%m-%d')
    except:
        pass
    
    # Manual format handling
    # YYYY-MM-DD
    if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
        return date_str
    
    # YYYYMMDD
    if len(date_str) == 8 and date_str.isdigit():
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    
    # Fallback to today
    return datetime.now().strftime('%Y-%m-%d')


def insert_staging_csv_raw(
    supabase: Client,
    project_id: str,
    dataset_id: str,
    mapping_id: str,
    schema_version: int,
    payloads: List[Dict[str, Any]],
    batch_num: int = 0
) -> int:
    """
    Insert raw CSV rows into staging_csv_raw (Staging layer).
    One staging row per CSV source row; payload = column -> value.
    """
    if not payloads:
        return 0
    staging_rows = [
        {
            'project_id': project_id,
            'dataset_id': dataset_id,
            'mapping_id': mapping_id,
            'schema_version': schema_version,
            'payload': p,
        }
        for p in payloads
    ]
    try:
        supabase.table('staging_csv_raw').insert(staging_rows).execute()
        count = len(staging_rows)
        logger.info(f"Staging batch {batch_num}: Inserted {count} rows into staging_csv_raw")
        return count
    except Exception as e:
        logger.error(f"Error inserting staging batch {batch_num}: {e}")
        raise


def upsert_batch_to_supabase(
    supabase: Client,
    records: List[Dict[str, Any]],
    batch_num: int = 0
) -> int:
    """
    Upsert a batch of records to Supabase (Mart layer).
    Deterministic transform from Staging; no LLM.
    """
    if not records:
        return 0
    
    try:
        response = supabase.table('mart_csv_daily_metrics').upsert(
            records,
            on_conflict='project_id,dataset_id,date,metric_name,dimension_key,dimension_value'
        ).execute()
        
        inserted_count = len(records)
        logger.info(f"Batch {batch_num}: Inserted {inserted_count} records into mart_csv_daily_metrics")
        return inserted_count
        
    except Exception as e:
        logger.error(f"Error upserting batch {batch_num}: {e}")
        raise


def _to_jsonable(val: Any) -> Any:
    """Convert a cell value to JSON-serializable type (for staging payload)."""
    if pd.isna(val):
        return None
    if hasattr(val, 'strftime'):
        return val.strftime('%Y-%m-%d')
    if hasattr(val, 'item'):
        return val.item()
    if isinstance(val, (str, int, float, bool)) or val is None:
        return val
    return str(val)


def _df_rows_to_staging_payloads(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert DataFrame rows to staging payloads (column -> value, JSON-serializable)."""
    payloads = []
    for _, row in df.iterrows():
        payload = {col: _to_jsonable(row[col]) for col in df.columns}
        payloads.append(payload)
    return payloads


def ingest_csv_file(
    supabase: Client,
    project_id: str,
    dataset_id: str,
    file_id: str,
    storage_path: str,
    headers: List[str],
    mapping: Dict[str, Any],
    date_range_filter: Optional[Dict[str, str]] = None,
    original_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main function to ingest a CSV file using Pandas
    
    Args:
        supabase: Supabase client
        project_id: Project ID
        dataset_id: Dataset ID
        file_id: CSV file ID
        storage_path: Path to file in storage
        headers: Original CSV/Excel headers
        mapping: Source mapping configuration
        date_range_filter: Optional date range filter
        original_filename: e.g. "data.xlsx" to use read_excel instead of read_csv
        
    Returns:
        Result dictionary with:
        - total_rows: Total rows in file
        - processed_rows: Rows processed
        - inserted_records: Records inserted
        - errors: List of errors
        - processing_time_ms: Processing time in milliseconds
    """
    import time
    start_time = time.time()
    
    result = {
        'total_rows': 0,
        'processed_rows': 0,
        'inserted_records': 0,
        'errors': [],
        'processing_time_ms': 0
    }
    
    mapping_id = mapping.get('id') or ''
    schema_version = int(mapping.get('schema_version', 1))

    try:
        # 1. Download file
        logger.info(f"Downloading file: {storage_path}")
        file_content = download_csv_from_storage(supabase, storage_path)
        file_size_mb = len(file_content) / (1024 * 1024)
        logger.info(f"File size: {file_size_mb:.2f} MB")

        is_excel = _is_excel_filename(original_filename)
        if is_excel:
            # Excel: read full file with read_excel (no chunking)
            logger.info("Processing as Excel (read_excel)")
            df = parse_excel_with_pandas(file_content, original_filename or "file.xlsx")
            result['total_rows'] = len(df)
            payloads = _df_rows_to_staging_payloads(df)
            for i in range(0, len(payloads), BATCH_SIZE):
                batch_payloads = payloads[i:i + BATCH_SIZE]
                insert_staging_csv_raw(
                    supabase, project_id, dataset_id, mapping_id, schema_version,
                    batch_payloads, i
                )
            records = transform_dataframe_to_records(
                df, headers, mapping, project_id, dataset_id, date_range_filter
            )
            for i in range(0, len(records), BATCH_SIZE):
                batch = records[i:i + BATCH_SIZE]
                inserted = upsert_batch_to_supabase(supabase, batch, i)
                result['inserted_records'] += inserted
            result['processed_rows'] = len(df)
            try:
                supabase.table('csv_files').update({
                    'ingestion_method': 'pandas'
                }).eq('id', file_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update ingestion_method: {e}")
        else:
            # CSV: existing chunk or full-file logic
            use_chunks = file_size_mb > CHUNK_SIZE_THRESHOLD_MB

            if use_chunks:
                logger.info(f"Using chunk processing (file > {CHUNK_SIZE_THRESHOLD_MB}MB)")
                batch_num = 0
                for chunk_df in parse_csv_with_pandas_chunks(file_content):
                    result['total_rows'] += len(chunk_df)
                    payloads = _df_rows_to_staging_payloads(chunk_df)
                    for i in range(0, len(payloads), BATCH_SIZE):
                        batch_payloads = payloads[i:i + BATCH_SIZE]
                        insert_staging_csv_raw(
                            supabase, project_id, dataset_id, mapping_id, schema_version,
                            batch_payloads, batch_num
                        )
                        batch_num += 1
                    records = transform_dataframe_to_records(
                        chunk_df,
                        headers,
                        mapping,
                        project_id,
                        dataset_id,
                        date_range_filter
                    )
                    for i in range(0, len(records), BATCH_SIZE):
                        batch = records[i:i + BATCH_SIZE]
                        inserted = upsert_batch_to_supabase(supabase, batch, batch_num)
                        result['inserted_records'] += inserted
                        batch_num += 1
                    result['processed_rows'] += len(chunk_df)
            else:
                logger.info("Processing entire file at once")
                df = parse_csv_with_pandas(file_content)
                result['total_rows'] = len(df)
                payloads = _df_rows_to_staging_payloads(df)
                for i in range(0, len(payloads), BATCH_SIZE):
                    batch_payloads = payloads[i:i + BATCH_SIZE]
                    insert_staging_csv_raw(
                        supabase, project_id, dataset_id, mapping_id, schema_version,
                        batch_payloads, i
                    )
                records = transform_dataframe_to_records(
                    df,
                    headers,
                    mapping,
                    project_id,
                    dataset_id,
                    date_range_filter
                )
                batch_num = 0
                for i in range(0, len(records), BATCH_SIZE):
                    batch = records[i:i + BATCH_SIZE]
                    inserted = upsert_batch_to_supabase(supabase, batch, batch_num)
                    result['inserted_records'] += inserted
                    batch_num += 1
                result['processed_rows'] = len(df)

            # Update csv_files record with ingestion_method
            try:
                supabase.table('csv_files').update({
                    'ingestion_method': 'pandas'
                }).eq('id', file_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update ingestion_method: {e}")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error ingesting CSV file: {error_msg}")
        result['errors'].append(error_msg)
    
    finally:
        result['processing_time_ms'] = int((time.time() - start_time) * 1000)
        logger.info(f"Ingestion completed: {result['inserted_records']} records in {result['processing_time_ms']}ms")
    
    return result
