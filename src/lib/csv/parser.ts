/**
 * CSV Parser utilities
 * Parses CSV content and extracts headers, sample rows, and metadata
 */

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
  totalRows: number
  columnCount: number
}

export interface CsvMetadata {
  headers: string[]
  sampleRows: string[][]
  totalRows: number
  columnCount: number
}

/**
 * Check if a line is a comment line (starts with #)
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('#')
}

/**
 * Check if a line is a separator line (all dashes, underscores, or similar)
 */
function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length === 0) return true
  
  // Check if line consists only of separators (dashes, underscores, equals, spaces, #)
  const separatorPattern = /^[\s\-_=#]+$/
  return separatorPattern.test(trimmed)
}

/**
 * Find the actual header row (skip comment lines, separator lines, and empty lines)
 * Improved logic: Headers should have multiple columns and look like column names (not data)
 */
function findHeaderRow(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue
    if (isCommentLine(line)) continue // Skip comment lines
    if (isSeparatorLine(line)) continue // Skip separator lines
    
    const parsed = parseCsvLine(line)
    // Header should have at least 2 columns (single column is likely metadata, not header)
    if (parsed.length < 2) continue
    
    // Filter out empty columns
    const validColumns = parsed.filter(col => {
      const trimmedCol = col.trim()
      return trimmedCol.length > 0 && !trimmedCol.startsWith('#')
    })
    
    // Header should have at least 2 valid columns
    if (validColumns.length < 2) continue
    
    // Check if this looks like a header (not data):
    // - Headers usually don't start with numbers
    // - Headers usually have text-based column names
    // - If most columns are numeric-only, it's likely data, not header
    const numericColumns = validColumns.filter(col => {
      const trimmed = col.trim()
      // Check if column is purely numeric (with possible decimal point)
      return /^[\d.,\s-]+$/.test(trimmed) && trimmed.length > 0
    })
    
    // If more than 50% of columns are purely numeric, it's likely data, not header
    if (numericColumns.length > validColumns.length * 0.5) {
      continue
    }
    
    // This looks like a header row
    return i
  }
  return 0 // Fallback to first line
}

/**
 * Parse CSV content and extract all data
 * Use for ingestion where all rows are needed
 */
export function parseCsvFull(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0, columnCount: 0 }
  }

  // Find actual header row (skip separator lines)
  const headerRowIndex = findHeaderRow(lines)
  const headers = parseCsvLine(lines[headerRowIndex]).filter(h => h.trim().length > 0)
  
  if (headers.length === 0) {
    console.warn('[CSV Parser] No valid headers found')
    return { headers: [], rows: [], totalRows: 0, columnCount: 0 }
  }

  const rows: string[][] = []
  
  // Process data rows (skip header, comment lines, and separator lines)
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue
    if (isCommentLine(line)) continue // Skip comment lines
    if (isSeparatorLine(line)) continue // Skip separator lines
    
    const row = parseCsvLine(line)
    if (row.length > 0) {
      rows.push(row)
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    columnCount: headers.length,
  }
}

/**
 * Parse CSV content and extract metadata + sample rows only
 * Use for upload/probe where only sample is needed (memory efficient)
 */
export function parseCsvMetadata(content: string, sampleSize = 20): CsvMetadata {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  
  if (lines.length === 0) {
    return { headers: [], sampleRows: [], totalRows: 0, columnCount: 0 }
  }

  // Find actual header row (skip separator lines)
  const headerRowIndex = findHeaderRow(lines)
  const headers = parseCsvLine(lines[headerRowIndex]).filter(h => h.trim().length > 0)
  
  if (headers.length === 0) {
    console.warn('[CSV Parser] No valid headers found in metadata')
    return { headers: [], sampleRows: [], totalRows: 0, columnCount: 0 }
  }

  const sampleRows: string[][] = []
  
  // Only parse sample rows for metadata (skip comment lines and separator lines)
  const dataLineCount = lines.length - headerRowIndex - 1
  let parsedCount = 0
  for (let i = headerRowIndex + 1; i < lines.length && parsedCount < sampleSize; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue
    if (isCommentLine(line)) continue // Skip comment lines
    if (isSeparatorLine(line)) continue // Skip separator lines
    
    const row = parseCsvLine(line)
    if (row.length > 0) {
      sampleRows.push(row)
      parsedCount++
    }
  }

  return {
    headers,
    sampleRows,
    totalRows: dataLineCount,
    columnCount: headers.length,
  }
}

/**
 * @deprecated Use parseCsvMetadata or parseCsvFull instead
 * Kept for backward compatibility
 */
export function parseCsvContent(content: string, sampleSize = 20): CsvMetadata {
  return parseCsvMetadata(content, sampleSize)
}

/**
 * Parse a single CSV line, handling quoted fields
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Mask sensitive data in sample rows for LLM processing
 * Replaces potential PII with placeholders
 */
export function maskSensitiveData(rows: string[][]): string[][] {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^[\d\-\+\(\)\s]{7,}$/
  const creditCardRegex = /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/

  return rows.map(row => 
    row.map(cell => {
      if (emailRegex.test(cell)) return '[EMAIL]'
      if (phoneRegex.test(cell)) return '[PHONE]'
      if (creditCardRegex.test(cell)) return '[CARD]'
      if (/^\d{10,}$/.test(cell)) return '[ID]'
      return cell
    })
  )
}

export type ColumnType = 'date' | 'number' | 'currency' | 'percentage' | 'string' | 'id' | 'unknown'

export interface ColumnAnalysis {
  type: ColumnType
  confidence: number // 0-1
  sampleValues: string[]
  stats?: {
    min?: number
    max?: number
    avg?: number
    hasDecimals?: boolean
    uniqueRatio?: number // unique values / total values
  }
}

/**
 * Deep analyze a single column to determine its type
 * More sophisticated than simple pattern matching
 */
function analyzeColumn(values: string[]): ColumnAnalysis {
  const nonEmptyValues = values.filter(v => v && v.trim() !== '')
  
  if (nonEmptyValues.length === 0) {
    return { type: 'unknown', confidence: 0, sampleValues: [] }
  }

  const sampleValues = nonEmptyValues.slice(0, 5)
  
  // === DATE DETECTION ===
  const datePatterns = [
    { regex: /^\d{4}-\d{2}-\d{2}(T.*)?$/, weight: 1.0 },  // ISO: 2024-01-15
    { regex: /^\d{4}\/\d{2}\/\d{2}$/, weight: 1.0 },     // 2024/01/15
    { regex: /^\d{2}\/\d{2}\/\d{4}$/, weight: 0.9 },     // 01/15/2024
    { regex: /^\d{4}\.\d{2}\.\d{2}$/, weight: 1.0 },     // 2024.01.15 (Korean)
    { regex: /^\d{8}$/, weight: 0.7 },                   // 20240115
    { regex: /^\d{4}-\d{2}$/, weight: 0.8 },             // 2024-01 (Year-Month)
    { regex: /^\d{4}년\s*\d{1,2}월/, weight: 1.0 },      // 2024년 1월
    { regex: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, weight: 0.8 },
    { regex: /^\d{1,2}월\s*\d{1,2}일/, weight: 0.9 },    // 1월 15일
  ]
  
  let dateMatchCount = 0
  let dateWeight = 0
  for (const v of nonEmptyValues) {
    for (const { regex, weight } of datePatterns) {
      if (regex.test(v)) {
        dateMatchCount++
        dateWeight += weight
        break
      }
    }
  }
  
  if (dateMatchCount / nonEmptyValues.length >= 0.5) { // 50% threshold for dates
    return {
      type: 'date',
      confidence: dateWeight / nonEmptyValues.length,
      sampleValues,
    }
  }

  // === ID DETECTION (before number to avoid false positives) ===
  // IDs are often all numbers but with high uniqueness and no statistical meaning
  const uniqueValues = new Set(nonEmptyValues)
  const uniqueRatio = uniqueValues.size / nonEmptyValues.length
  
  // If all values are unique and look like sequential/random numbers
  const looksLikeId = nonEmptyValues.every(v => /^\d+$/.test(v))
  if (looksLikeId && uniqueRatio > 0.9 && nonEmptyValues.length > 3) {
    return {
      type: 'id',
      confidence: 0.8,
      sampleValues,
      stats: { uniqueRatio },
    }
  }

  // === NUMERIC DETECTION (More lenient) ===
  const cleanNumber = (v: string): number | null => {
    // Remove currency symbols, commas, spaces, percentage signs
    const cleaned = v.replace(/[$€¥₩£,\s]/g, '').replace(/%$/, '')
    if (cleaned === '' || cleaned === '-' || cleaned === 'N/A' || cleaned === 'NA') return null
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const numericResults = nonEmptyValues.map(v => ({ original: v, num: cleanNumber(v) }))
  const validNumbers = numericResults.filter(r => r.num !== null)
  const numericRatio = validNumbers.length / nonEmptyValues.length

  // 50% threshold for numbers (much more lenient)
  if (numericRatio >= 0.5) {
    const nums = validNumbers.map(r => r.num!)
    const hasDecimals = nums.some(n => n !== Math.floor(n))
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length

    // Check for currency indicators
    const hasCurrencySymbol = nonEmptyValues.some(v => /[$€¥₩£]/.test(v))
    if (hasCurrencySymbol) {
      return {
        type: 'currency',
        confidence: numericRatio,
        sampleValues,
        stats: { min, max, avg, hasDecimals, uniqueRatio },
      }
    }

    // Check for percentage
    const hasPercentSign = nonEmptyValues.some(v => /%/.test(v))
    // Or if all values are 0-1 range with decimals (ratio/rate)
    const isRatioLike = nums.every(n => n >= 0 && n <= 1) && hasDecimals
    
    if (hasPercentSign || isRatioLike) {
      return {
        type: 'percentage',
        confidence: numericRatio,
        sampleValues,
        stats: { min, max, avg, hasDecimals, uniqueRatio },
      }
    }

    return {
      type: 'number',
      confidence: numericRatio,
      sampleValues,
      stats: { min, max, avg, hasDecimals, uniqueRatio },
    }
  }

  // === STRING/CATEGORICAL ===
  const avgLength = nonEmptyValues.reduce((sum, v) => sum + v.length, 0) / nonEmptyValues.length
  
  return {
    type: 'string',
    confidence: 1 - numericRatio, // Higher confidence if less numeric
    sampleValues,
    stats: { uniqueRatio },
  }
}

/**
 * Infer column types from sample data with deep analysis
 * Returns detailed analysis for each column
 */
export function inferColumnTypes(
  headers: string[],
  sampleRows: string[][]
): Record<string, ColumnType> {
  const result: Record<string, ColumnType> = {}
  
  headers.forEach((header, colIndex) => {
    const values = sampleRows.map(row => row[colIndex] || '')
    const analysis = analyzeColumn(values)
    result[header] = analysis.type
  })

  return result
}

/**
 * Get detailed column analysis (for debugging and LLM context)
 */
export function getDetailedColumnAnalysis(
  headers: string[],
  sampleRows: string[][]
): Record<string, ColumnAnalysis> {
  const result: Record<string, ColumnAnalysis> = {}
  
  headers.forEach((header, colIndex) => {
    const values = sampleRows.map(row => row[colIndex] || '')
    result[header] = analyzeColumn(values)
  })

  return result
}
