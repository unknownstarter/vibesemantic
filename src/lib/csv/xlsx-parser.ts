/**
 * XLSX/Excel parser utilities
 * Parses Excel files and extracts headers, sample rows, and metadata (same shape as CSV for upload/probe)
 */

import * as XLSX from 'xlsx'
import type { CsvMetadata } from './parser'

const SAMPLE_ROW_COUNT = 20

/**
 * Parse XLSX/Excel buffer and extract metadata from the first sheet.
 * Returns the same shape as parseCsvMetadata for upload and probe compatibility.
 */
export function parseXlsxMetadata(buffer: ArrayBuffer): CsvMetadata {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { headers: [], sampleRows: [], totalRows: 0, columnCount: 0 }
  }

  const sheet = workbook.Sheets[firstSheetName]
  // header: 1 => array of arrays (row-major)
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  if (!rows || rows.length === 0) {
    return { headers: [], sampleRows: [], totalRows: 0, columnCount: 0 }
  }

  const headers = (rows[0] ?? []).map((c) => (c != null ? String(c).trim() : ''))
  const dataRows = rows.slice(1).filter((row) => row.some((c) => c != null && String(c).trim() !== ''))
  const totalRows = dataRows.length
  const columnCount = headers.length

  const sampleRows = dataRows
    .slice(0, SAMPLE_ROW_COUNT)
    .map((row) => headers.map((_, i) => (row[i] != null ? String(row[i]).trim() : '')))

  return {
    headers,
    sampleRows,
    totalRows,
    columnCount,
  }
}
