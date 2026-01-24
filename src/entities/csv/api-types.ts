/**
 * CSV API Response Types
 * Standard response types for CSV-related API endpoints
 */

import type {
  CsvDataset,
  CsvFile,
  SourceMapping,
  MetricColumn,
  DimensionColumn,
  LLMQuestion,
} from '@/types/database'

// ============ Common ============

export interface ApiErrorResponse {
  error: string
}

export interface ApiSuccessResponse<T> {
  data: T
}

// ============ Dataset ============

export interface DatasetWithRelations extends CsvDataset {
  csv_files: CsvFile[]
  source_mappings: SourceMappingDetail | null
}

export interface DatasetListItem extends CsvDataset {
  csv_files?: Pick<CsvFile, 'id' | 'original_filename' | 'status' | 'is_active'>[]
  source_mappings?: Pick<SourceMapping, 'id' | 'status'> | null
}

export interface SourceMappingDetail {
  id: string
  status: string
  date_column: string | null
  metric_columns: MetricColumn[]
  dimension_columns: DimensionColumn[]
  aggregation_rules: Record<string, string>
  llm_questions: LLMQuestion[]
}

// GET /api/projects/[projectId]/csv/datasets
export interface ListDatasetsResponse {
  datasets: DatasetListItem[]
}

// POST /api/projects/[projectId]/csv/datasets
export interface CreateDatasetRequest {
  name: string
}

export interface CreateDatasetResponse {
  dataset: CsvDataset
}

// GET /api/projects/[projectId]/csv/datasets/[datasetId]
export interface GetDatasetResponse {
  dataset: DatasetWithRelations
}

// PATCH /api/projects/[projectId]/csv/datasets/[datasetId]
export interface UpdateDatasetRequest {
  name?: string
  status?: CsvDataset['status']
  mapping_id?: string
}

export interface UpdateDatasetResponse {
  dataset: CsvDataset
}

// DELETE /api/projects/[projectId]/csv/datasets/[datasetId]
export interface DeleteDatasetResponse {
  success: boolean
}

// ============ File Upload ============

// POST /api/projects/[projectId]/csv/datasets/[datasetId]/upload
export interface UploadFilesResponse {
  files: CsvFile[]
  count: number
}

// GET /api/projects/[projectId]/csv/datasets/[datasetId]/upload
export interface ListFilesResponse {
  files: CsvFile[]
}

// ============ Probe ============

// POST /api/projects/[projectId]/csv/datasets/[datasetId]/probe
export interface ProbeRequest {
  language?: 'ko' | 'en'
  fileId?: string
}

export interface ProbeResponse {
  mapping: {
    id: string
    dateColumn: string | null
    metricColumns: MetricColumn[]
    dimensionColumns: DimensionColumn[]
    aggregationRules: Record<string, string>
    llmQuestions: LLMQuestion[]
  }
}

// ============ Confirm ============

// POST /api/projects/[projectId]/csv/datasets/[datasetId]/confirm
export interface ConfirmRequest {
  dateColumn?: string
  metricColumns?: MetricColumn[]
  dimensionColumns?: DimensionColumn[]
  aggregationRules?: Record<string, string>
}

export interface ConfirmResponse {
  dataset: CsvDataset
  message: string
}

// ============ Ingest ============

// POST /api/projects/[projectId]/csv/datasets/[datasetId]/ingest
export interface IngestResult {
  totalRows: number
  processedRows: number
  insertedRecords: number
  errors: string[]
}

export interface IngestResponse {
  result: IngestResult
  status: CsvDataset['status']
}
