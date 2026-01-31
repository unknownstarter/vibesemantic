/**
 * CSV Ingest utilities
 * Transforms CSV data according to mapping and loads into mart table
 * Supports both TypeScript (small files) and Pandas (large files) ingestion
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json, MetricColumn } from '@/types/database'
import { parseCsvFull } from './parser'

export interface IngestResult {
  totalRows: number
  processedRows: number
  insertedRecords: number
  errors: string[]
}

export interface SourceMapping {
  id: string
  schema_version?: number
  date_column: string | null
  metric_columns: MetricColumn[]
  dimension_columns: Array<{ name: string; displayName?: string; type: string }>
  aggregation_rules: Record<string, string>
}

/**
 * Ingest CSV file via Python Brain API (Pandas)
 */
async function ingestViaPandasAPI(
  file: { id: string; storage_path: string; original_filename: string; headers: string[] },
  projectId: string,
  datasetId: string,
  mapping: SourceMapping,
  dateRangeFilter?: { startDate: Date; endDate: Date }
): Promise<IngestResult> {
  const brainApiUrl = process.env.BRAIN_API_URL
  const brainApiKey = process.env.BRAIN_API_KEY

  if (!brainApiUrl || !brainApiKey) {
    throw new Error('BRAIN_API_URL and BRAIN_API_KEY must be set for Pandas ingestion')
  }

  const dateRange = dateRangeFilter ? {
    start: dateRangeFilter.startDate.toISOString().split('T')[0],
    end: dateRangeFilter.endDate.toISOString().split('T')[0],
  } : undefined

  const response = await fetch(`${brainApiUrl}/api/v1/collect/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': brainApiKey,
    },
    body: JSON.stringify({
      project_id: projectId,
      dataset_id: datasetId,
      file_id: file.id,
      storage_path: file.storage_path,
      original_filename: file.original_filename,
      headers: file.headers,
      mapping: {
        id: mapping.id,
        schema_version: mapping.schema_version ?? 1,
        date_column: mapping.date_column,
        metric_columns: mapping.metric_columns,
        dimension_columns: mapping.dimension_columns,
        aggregation_rules: mapping.aggregation_rules,
      },
      date_range: dateRange,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pandas API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    totalRows: data.total_rows || 0,
    processedRows: data.processed_rows || 0,
    insertedRecords: data.inserted_records || 0,
    errors: data.errors || [],
  }
}

/**
 * Ingest CSV files from a dataset into mart_csv_daily_metrics
 * Uses hybrid approach: TypeScript for small files, Pandas for large files
 */
export async function ingestDataset(
  supabase: SupabaseClient<Database>,
  projectId: string,
  datasetId: string,
  mapping: SourceMapping,
  dateRangeFilter?: { startDate: Date; endDate: Date }
): Promise<IngestResult> {
  const result: IngestResult = {
    totalRows: 0,
    processedRows: 0,
    insertedRecords: 0,
    errors: [],
  }

  // Get all active files in dataset
  const { data: files, error: filesError } = await supabase
    .from('csv_files')
    .select('id, storage_path, original_filename, file_size_bytes, headers')
    .eq('dataset_id', datasetId)
    .eq('is_active', true)

  if (filesError || !files || files.length === 0) {
    result.errors.push('No active files found in dataset')
    return result
  }

  // File size threshold for Pandas (10MB)
  const PANDAS_THRESHOLD_MB = 10

  for (const file of files) {
    const fileSizeMB = (file.file_size_bytes || 0) / (1024 * 1024)
    const lowerName = (file.original_filename ?? '').toLowerCase()
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')
    const usePandas = isExcel || fileSizeMB >= PANDAS_THRESHOLD_MB

    try {
      if (usePandas) {
        // Use Pandas API for large files
        console.log(`[Ingest] Using Pandas for large file: ${file.original_filename} (${fileSizeMB.toFixed(2)}MB)`)
        const pandasResult = await ingestViaPandasAPI(
          {
            id: file.id,
            storage_path: file.storage_path,
            original_filename: file.original_filename,
            headers: (file.headers as string[]) || [],
          },
          projectId,
          datasetId,
          mapping,
          dateRangeFilter
        )

        result.totalRows += pandasResult.totalRows
        result.processedRows += pandasResult.processedRows
        result.insertedRecords += pandasResult.insertedRecords
        result.errors.push(...pandasResult.errors)

        // Update ingestion_method in database
        await supabase
          .from('csv_files')
          .update({ ingestion_method: 'pandas' })
          .eq('id', file.id)
      } else {
        // Use TypeScript for small files (existing logic)
        console.log(`[Ingest] Using TypeScript for small file: ${file.original_filename} (${fileSizeMB.toFixed(2)}MB)`)
        const tsResult = await ingestViaTypeScript(
          supabase,
          file,
          projectId,
          datasetId,
          mapping,
          dateRangeFilter
        )

        result.totalRows += tsResult.totalRows
        result.processedRows += tsResult.processedRows
        result.insertedRecords += tsResult.insertedRecords
        result.errors.push(...tsResult.errors)

        // Update ingestion_method in database
        await supabase
          .from('csv_files')
          .update({ ingestion_method: 'typescript' })
          .eq('id', file.id)
      }
    } catch (error) {
      const errorMsg = `Error processing ${file.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(`[Ingest] ${errorMsg}`, error)

      // Fallback to TypeScript if Pandas fails
      if (usePandas) {
        console.log(`[Ingest] Pandas failed, falling back to TypeScript for ${file.original_filename}`)
        try {
          const tsResult = await ingestViaTypeScript(
            supabase,
            file,
            projectId,
            datasetId,
            mapping,
            dateRangeFilter
          )
          result.totalRows += tsResult.totalRows
          result.processedRows += tsResult.processedRows
          result.insertedRecords += tsResult.insertedRecords
          result.errors.push(...tsResult.errors)
        } catch (fallbackError) {
          result.errors.push(`Fallback to TypeScript also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`)
        }
      }
    }
  }

  return result
}

/**
 * Ingest CSV file via TypeScript (original implementation)
 */
async function ingestViaTypeScript(
  supabase: SupabaseClient<Database>,
  file: { id: string; storage_path: string; original_filename: string },
  projectId: string,
  datasetId: string,
  mapping: SourceMapping,
  dateRangeFilter?: { startDate: Date; endDate: Date }
): Promise<IngestResult> {
  const result: IngestResult = {
    totalRows: 0,
    processedRows: 0,
    insertedRecords: 0,
    errors: [],
  }

  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('csv-uploads')
      .download(file.storage_path)

    if (downloadError || !fileData) {
      result.errors.push(`Failed to download file ${file.original_filename}: ${downloadError?.message}`)
      return result
    }

    // Parse CSV content - use parseCsvFull for complete data
    const content = await fileData.text()
    const parseResult = parseCsvFull(content)
    
    if (parseResult.headers.length === 0) {
      result.errors.push(`File ${file.original_filename}: No valid headers found. The CSV may be malformed or contain only separator lines.`)
      return result
    }

    result.totalRows += parseResult.totalRows

    // 1. Insert raw rows into Staging (Staging layer)
    const schemaVersion = mapping.schema_version ?? 1
    const stagingPayloads = parseResult.rows.map((row) => {
      const payload: Record<string, string | number | null> = {}
      parseResult.headers.forEach((h, idx) => {
        payload[h] = row[idx] ?? null
      })
      return payload
    })
    if (stagingPayloads.length > 0) {
      const batchSize = 1000
      for (let i = 0; i < stagingPayloads.length; i += batchSize) {
        const batch = stagingPayloads.slice(i, i + batchSize).map((payload) => ({
          project_id: projectId,
          dataset_id: datasetId,
          mapping_id: mapping.id,
          schema_version: schemaVersion,
          payload,
        }))
        const { error: stagingError } = await supabase.from('staging_csv_raw').insert(batch)
        if (stagingError) {
          result.errors.push(`Staging insert: ${stagingError.message}`)
          console.error('[Ingest] Staging insert error:', stagingError)
        }
      }
    }

    // 2. Deterministic transform Staging → Mart (no LLM)
    let records: MartRecord[]
    try {
      records = transformToMartRecords(
        parseResult.headers,
        parseResult.rows,
        mapping,
        projectId,
        datasetId,
        dateRangeFilter
      )
    } catch (transformError) {
      result.errors.push(
        `File ${file.original_filename}: ${transformError instanceof Error ? transformError.message : 'Failed to transform records'}`
      )
      console.error(`[Ingest] Transform error for ${file.original_filename}:`, transformError)
      return result
    }

    // 3. Batch upsert to mart table
    if (records.length > 0) {
      const batchSize = 1000
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)

        const { error: upsertError } = await supabase
          .from('mart_csv_daily_metrics')
          .upsert(batch, {
            onConflict: 'project_id,dataset_id,date,metric_name,dimension_key,dimension_value',
          })

          if (upsertError) {
            const errorMsg = `Batch insert error: ${upsertError.message}`
            result.errors.push(errorMsg)
            console.error(`[Ingest] ${errorMsg}`)
            console.error(`[Ingest] Failed batch sample (first record):`, batch[0])
            // Log more details for debugging
            if (batch.length > 0) {
              console.error(`[Ingest] Sample record structure:`, {
                project_id: batch[0].project_id,
                dataset_id: batch[0].dataset_id,
                date: batch[0].date,
                date_type: typeof batch[0].date,
                metric_name: batch[0].metric_name,
                metric_value: batch[0].metric_value,
                dimensions_type: typeof batch[0].dimensions,
                raw_data_type: typeof batch[0].raw_data,
              })
            }
          } else {
            result.insertedRecords += batch.length
          }
        }
      }

      result.processedRows += parseResult.totalRows
    } catch (error) {
      result.errors.push(`Error processing ${file.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
}

/**
 * Mart record type - supports both legacy single dimension and new multi-dimension
 */
interface MartRecord {
  project_id: string
  dataset_id: string
  date: string
  metric_name: string
  metric_value: number | null
  // Legacy fields (for backward compatibility)
  dimension_key: string | null
  dimension_value: string | null
  // New: all dimensions as JSONB
  dimensions: Record<string, string> | null
  // New: preserve original row data
  raw_data?: Record<string, unknown> | null
}

/**
 * Transform parsed CSV rows into mart_csv_daily_metrics records
 * Now supports multiple dimensions via JSONB
 */
function transformToMartRecords(
  headers: string[],
  rows: string[][],
  mapping: SourceMapping,
  projectId: string,
  datasetId: string,
  dateRangeFilter?: { startDate: Date; endDate: Date }
): MartRecord[] {
  const records: MartRecord[] = []

  // Validate column mappings exist in headers
  const missingColumns: string[] = []
  
  if (mapping.date_column && headers.indexOf(mapping.date_column) === -1) {
    missingColumns.push(`date_column: "${mapping.date_column}"`)
  }

  mapping.metric_columns.forEach(m => {
    if (headers.indexOf(m.name) === -1) {
      missingColumns.push(`metric: "${m.name}"`)
    }
  })

  mapping.dimension_columns.forEach(d => {
    if (headers.indexOf(d.name) === -1) {
      missingColumns.push(`dimension: "${d.name}"`)
    }
  })

  if (missingColumns.length > 0) {
    throw new Error(
      `Column mapping mismatch. The following columns are not found in CSV headers: ${missingColumns.join(', ')}. ` +
      `Available headers: ${headers.join(', ')}`
    )
  }

  const dateColIndex = mapping.date_column
    ? headers.indexOf(mapping.date_column)
    : -1

  const metricIndices = mapping.metric_columns
    .map(m => ({
      ...m,
      index: headers.indexOf(m.name),
    }))
    .filter(m => m.index >= 0) // Filter out any invalid indices (shouldn't happen after validation)

  const dimensionIndices = mapping.dimension_columns
    .map(d => ({
      ...d,
      index: headers.indexOf(d.name),
    }))
    .filter(d => d.index >= 0) // Filter out any invalid indices

  // If no date column, use a valid date placeholder (today's date)
  // Date column is NOT required - aggregate data without time dimension is valid
  // But database DATE column requires a valid date, so we use today's date as placeholder
  // This allows aggregate data to be stored and queried
  const defaultDate = !mapping.date_column 
    ? new Date().toISOString().split('T')[0] // YYYY-MM-DD format for DATE column
    : null

  for (const row of rows) {
    // Parse date
    let dateStr: string
    if (dateColIndex >= 0 && row[dateColIndex]) {
      dateStr = normalizeDate(row[dateColIndex])
    } else if (defaultDate) {
      // No date column - use today's date as placeholder for aggregate data
      // This is a valid DATE value that allows the data to be stored
      dateStr = defaultDate
    } else {
      // Should not happen, but fallback to today
      dateStr = new Date().toISOString().split('T')[0]
    }

    // Apply date filter if provided
    // Note: For aggregate data without date column, we use today's date as placeholder
    // So date filtering will still apply, but that's OK - we want to include aggregate data
    if (dateRangeFilter) {
      try {
        const date = new Date(dateStr)
        if (date < dateRangeFilter.startDate || date > dateRangeFilter.endDate) {
          continue
        }
      } catch {
        // Invalid date format - skip filtering for this row
        console.warn(`[Ingest] Invalid date format: ${dateStr}, skipping filter`)
      }
    }

    // Build ALL dimensions as a single object (not duplicating rows)
    const dimensions: Record<string, string> = {}
    for (const dim of dimensionIndices) {
      if (dim.index >= 0 && row[dim.index]) {
        dimensions[dim.name] = row[dim.index].trim()
      }
    }

    // Primary dimension for legacy compatibility
    const primaryDimKey = Object.keys(dimensions)[0] || null
    const primaryDimValue = primaryDimKey ? dimensions[primaryDimKey] : null

    // Build raw_data for full row preservation
    const rawData: Record<string, string | number | null> = {}
    headers.forEach((h, i) => {
      if (row[i] !== undefined && row[i] !== '') {
        rawData[h] = row[i]
      }
    })

    // Create ONE record per metric (not per dimension!)
    for (const metric of metricIndices) {
      if (metric.index < 0) continue

      const rawValue = row[metric.index]
      const numericValue = parseNumericValue(rawValue)

      records.push({
        project_id: projectId,
        dataset_id: datasetId,
        date: dateStr,
        metric_name: metric.name,
        metric_value: numericValue,
        // Legacy single dimension
        dimension_key: primaryDimKey,
        dimension_value: primaryDimValue,
        // New multi-dimension support - ensure non-empty object or null
        dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
        raw_data: Object.keys(rawData).length > 0 ? rawData : null,
      })
    }
  }

  return records
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim()
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // YYYY/MM/DD format
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-')
  }

  // MM/DD/YYYY format
  const mmddyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (mmddyyyy) {
    return `${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`
  }

  // DD/MM/YYYY format (assume if day > 12)
  const ddmmyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy && parseInt(ddmmyyyy[1]) > 12) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  }

  // Try native Date parsing as fallback
  try {
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // Fall through
  }

  return trimmed // Return as-is if can't parse
}

/**
 * Parse numeric value, handling various formats
 */
function parseNumericValue(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null

  // Remove currency symbols and thousand separators
  const cleaned = value
    .replace(/[$€¥₩]/g, '')
    .replace(/,/g, '')
    .trim()

  // Handle percentage
  if (cleaned.endsWith('%')) {
    const num = parseFloat(cleaned.slice(0, -1))
    return isNaN(num) ? null : num / 100
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
