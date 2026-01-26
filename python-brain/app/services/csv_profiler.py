"""
CSV Profiler Service using Pandas
Provides enhanced column analysis for schema detection
"""

import io
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def profile_csv_with_pandas(
    file_content: bytes,
    encoding: str = 'utf-8',
    max_rows: int = 10000  # Limit for profiling (full analysis if smaller)
) -> Dict[str, Any]:
    """
    Profile CSV file using Pandas for enhanced column analysis
    
    Args:
        file_content: CSV file content as bytes
        encoding: File encoding
        max_rows: Maximum rows to analyze (for large files)
        
    Returns:
        Dictionary with column statistics and analysis
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
                    encoding = enc
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise Exception("Could not decode CSV file with common encodings")
        
        # Read CSV with pandas
        # For profiling, we can read a sample if file is too large
        df = pd.read_csv(
            io.StringIO(content_str),
            encoding=encoding,
            nrows=max_rows if max_rows > 0 else None,
            on_bad_lines='skip',
            engine='c',
            low_memory=False
        )
        
        total_rows = len(df)
        logger.info(f"Profiling CSV: {total_rows} rows, {len(df.columns)} columns")
        
        # Analyze each column
        column_profiles = {}
        
        for col in df.columns:
            series = df[col]
            profile = analyze_column_with_pandas(series, col)
            column_profiles[col] = profile
        
        return {
            'total_rows': total_rows,
            'total_columns': len(df.columns),
            'columns': column_profiles,
            'encoding': encoding,
        }
        
    except Exception as e:
        logger.error(f"Error profiling CSV with pandas: {e}")
        raise


def analyze_column_with_pandas(
    series: pd.Series,
    column_name: str
) -> Dict[str, Any]:
    """
    Analyze a single column using Pandas
    
    Args:
        series: Pandas Series (column data)
        column_name: Column name
        
    Returns:
        Dictionary with detailed column analysis
    """
    profile: Dict[str, Any] = {
        'name': column_name,
        'dtype': str(series.dtype),
        'inferred_type': pd.api.types.infer_dtype(series, skipna=True),
        'null_count': int(series.isna().sum()),
        'null_ratio': float(series.isna().sum() / len(series)) if len(series) > 0 else 0.0,
        'non_null_count': int(series.notna().sum()),
        'unique_count': int(series.nunique()),
        'unique_ratio': float(series.nunique() / len(series)) if len(series) > 0 else 0.0,
    }
    
    # Sample values (non-null)
    non_null_values = series.dropna()
    if len(non_null_values) > 0:
        sample_size = min(5, len(non_null_values))
        profile['sample_values'] = non_null_values.head(sample_size).tolist()
    else:
        profile['sample_values'] = []
    
    # Type-specific analysis
    if pd.api.types.is_numeric_dtype(series):
        numeric_series = pd.to_numeric(series, errors='coerce').dropna()
        if len(numeric_series) > 0:
            profile['numeric_stats'] = {
                'min': float(numeric_series.min()),
                'max': float(numeric_series.max()),
                'mean': float(numeric_series.mean()),
                'median': float(numeric_series.median()),
                'std': float(numeric_series.std()) if len(numeric_series) > 1 else 0.0,
                'q1': float(numeric_series.quantile(0.25)),
                'q3': float(numeric_series.quantile(0.75)),
                'has_decimals': bool((numeric_series % 1 != 0).any()),
            }
            
            # Detect currency
            if series.dtype == 'object':
                str_values = series.dropna().astype(str)
                has_currency = str_values.str.contains(r'[$€¥₩£]', regex=True).any()
                profile['has_currency_symbol'] = bool(has_currency)
            
            # Detect percentage
            str_values = series.dropna().astype(str)
            has_percent = str_values.str.contains('%', regex=False).any()
            profile['has_percent_sign'] = bool(has_percent)
            
            # Determine type
            if profile.get('has_percent_sign') or (profile['numeric_stats']['min'] >= 0 and profile['numeric_stats']['max'] <= 1 and profile['numeric_stats']['has_decimals']):
                profile['detected_type'] = 'percentage'
            elif profile.get('has_currency_symbol'):
                profile['detected_type'] = 'currency'
            else:
                profile['detected_type'] = 'number'
        else:
            profile['detected_type'] = 'unknown'
    
    elif pd.api.types.is_datetime64_any_dtype(series):
        profile['detected_type'] = 'date'
        profile['date_stats'] = {
            'min_date': str(series.min()),
            'max_date': str(series.max()),
            'date_range_days': int((series.max() - series.min()).days) if len(series) > 0 else 0,
        }
    
    elif pd.api.types.is_bool_dtype(series):
        profile['detected_type'] = 'boolean'
        profile['bool_stats'] = {
            'true_count': int((series == True).sum()),
            'false_count': int((series == False).sum()),
        }
    
    else:
        # String/categorical analysis
        str_series = series.dropna().astype(str)
        if len(str_series) > 0:
            # Check if looks like date strings
            date_attempt = pd.to_datetime(str_series, errors='coerce', infer_datetime_format=True)
            date_valid_count = date_attempt.notna().sum()
            date_ratio = date_valid_count / len(str_series)
            
            if date_ratio > 0.5:  # More than 50% are valid dates
                profile['detected_type'] = 'date'
                profile['date_stats'] = {
                    'min_date': str(date_attempt.min()),
                    'max_date': str(date_attempt.max()),
                    'date_range_days': int((date_attempt.max() - date_attempt.min()).days) if date_valid_count > 0 else 0,
                }
            else:
                profile['detected_type'] = 'string'
                profile['string_stats'] = {
                    'avg_length': float(str_series.str.len().mean()),
                    'min_length': int(str_series.str.len().min()),
                    'max_length': int(str_series.str.len().max()),
                }
                
                # Check if looks like ID (high uniqueness + numeric strings)
                if profile['unique_ratio'] > 0.9:
                    numeric_str_count = str_series.str.match(r'^\d+$').sum()
                    if numeric_str_count / len(str_series) > 0.8:
                        profile['detected_type'] = 'id'
        else:
            profile['detected_type'] = 'unknown'
    
    # Calculate confidence
    confidence = calculate_confidence(profile)
    profile['confidence'] = confidence
    
    return profile


def calculate_confidence(profile: Dict[str, Any]) -> float:
    """
    Calculate confidence score for column type detection
    
    Args:
        profile: Column profile dictionary
        
    Returns:
        Confidence score (0.0 to 1.0)
    """
    base_confidence = 0.7
    
    # Increase confidence if low null ratio
    null_ratio = profile.get('null_ratio', 1.0)
    if null_ratio < 0.1:
        base_confidence += 0.1
    elif null_ratio < 0.3:
        base_confidence += 0.05
    
    # Increase confidence if type-specific stats are available
    detected_type = profile.get('detected_type', 'unknown')
    if detected_type == 'number' and 'numeric_stats' in profile:
        base_confidence += 0.1
    elif detected_type == 'date' and 'date_stats' in profile:
        base_confidence += 0.1
    elif detected_type == 'string' and 'string_stats' in profile:
        base_confidence += 0.05
    
    # Decrease confidence if high null ratio
    if null_ratio > 0.5:
        base_confidence -= 0.2
    
    return min(1.0, max(0.0, base_confidence))


def convert_pandas_profile_to_column_analysis(
    pandas_profile: Dict[str, Any]
) -> Dict[str, Dict[str, Any]]:
    """
    Convert Pandas profile format to ColumnAnalysis format (for TypeScript compatibility)
    
    Args:
        pandas_profile: Pandas profiling result
        
    Returns:
        Dictionary compatible with ColumnAnalysis interface
    """
    result = {}
    
    for col_name, profile in pandas_profile.get('columns', {}).items():
        detected_type = profile.get('detected_type', 'unknown')
        
        # Map pandas types to our types
        type_mapping = {
            'number': 'number',
            'currency': 'currency',
            'percentage': 'percentage',
            'date': 'date',
            'string': 'string',
            'id': 'id',
            'boolean': 'string',  # Boolean as string for compatibility
            'unknown': 'unknown',
        }
        
        column_type = type_mapping.get(detected_type, 'unknown')
        
        # Build stats
        stats = {}
        if 'numeric_stats' in profile:
            numeric = profile['numeric_stats']
            stats['min'] = numeric.get('min')
            stats['max'] = numeric.get('max')
            stats['avg'] = numeric.get('mean')
            stats['hasDecimals'] = numeric.get('has_decimals', False)
        
        stats['uniqueRatio'] = profile.get('unique_ratio', 0.0)
        
        result[col_name] = {
            'type': column_type,
            'confidence': profile.get('confidence', 0.7),
            'sampleValues': profile.get('sample_values', [])[:5],  # Limit to 5
            'stats': stats if stats else None,
        }
    
    return result
