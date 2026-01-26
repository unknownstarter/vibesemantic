/**
 * CSV Ingest utilities
 * Transforms CSV data according to mapping and loads into mart table
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, MetricColumn } from '@/types/database'
import { parseCsvFull } from './parser'

export interface IngestResult {
  totalRows: number
  processedRows: number
  insertedRecords: number
  errors: string[]
}

export interface SourceMapping {
  id: string
  date_column: string | null
  metric_columns: MetricColumn[]
  dimension_columns: Array<{ name: string; displayName?: string; type: string }>
  aggregation_rules: Record<string, string>
}

/**
 * Ingest CSV files from a dataset into mart_csv_daily_metrics
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
    .select('id, storage_path, original_filename')
    .eq('dataset_id', datasetId)
    .eq('is_active', true)

  if (filesError || !files || files.length === 0) {
    result.errors.push('No active files found in dataset')
    return result
  }

  for (const file of files) {
    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('csv-uploads')
        .download(file.storage_path)

      if (downloadError || !fileData) {
        result.errors.push(`Failed to download file ${file.original_filename}: ${downloadError?.message}`)
        continue
      }

      // Parse CSV content - use parseCsvFull for complete data
      const content = await fileData.text()
      const parseResult = parseCsvFull(content)
      
      if (parseResult.headers.length === 0) {
        result.errors.push(`File ${file.original_filename}: No valid headers found. The CSV may be malformed or contain only separator lines.`)
        continue
      }

      result.totalRows += parseResult.totalRows

      // Process rows according to mapping
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
        continue
      }

      // Batch upsert to mart table
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
            result.errors.push(`Batch insert error: ${upsertError.message}`)
          } else {
            result.insertedRecords += batch.length
          }
        }
      }

      result.processedRows += parseResult.totalRows
    } catch (error) {
      result.errors.push(`Error processing ${file.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
  dimensions: Record<string, string>
  // New: preserve original row data
  raw_data?: Record<string, string | number | null>
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

  for (const row of rows) {
    // Parse date
    let dateStr = 'unknown'
    if (dateColIndex >= 0 && row[dateColIndex]) {
      dateStr = normalizeDate(row[dateColIndex])
    }

    // Apply date filter if provided
    if (dateRangeFilter && dateStr !== 'unknown') {
      const date = new Date(dateStr)
      if (date < dateRangeFilter.startDate || date > dateRangeFilter.endDate) {
        continue
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
        // New multi-dimension support
        dimensions,
        raw_data: rawData,
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
