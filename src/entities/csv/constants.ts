/**
 * CSV Dataset related constants and configurations
 */

import type { CsvDatasetStatus, CsvFileStatus } from '@/types/database'

export interface StatusConfig {
  label: string
  labelEn: string
  color: string
  description: string
  descriptionEn: string
}

export const CSV_DATASET_STATUS: Record<CsvDatasetStatus, StatusConfig> = {
  draft: {
    label: '대기',
    labelEn: 'Draft',
    color: 'bg-subtle/30 text-muted',
    description: '파일을 업로드하고 스키마를 분석하세요',
    descriptionEn: 'Upload files and analyze schema',
  },
  probing: {
    label: '분석중',
    labelEn: 'Analyzing',
    color: 'bg-warning/20 text-warning',
    description: 'AI가 스키마를 분석하고 있습니다',
    descriptionEn: 'AI is analyzing the schema',
  },
  confirmed: {
    label: '확정',
    labelEn: 'Confirmed',
    color: 'bg-primary/20 text-primary',
    description: '매핑이 확정되었습니다. 데이터를 적재하세요',
    descriptionEn: 'Mapping confirmed. Ingest your data',
  },
  ingested: {
    label: '완료',
    labelEn: 'Complete',
    color: 'bg-success/20 text-success',
    description: '데이터가 성공적으로 적재되었습니다',
    descriptionEn: 'Data successfully ingested',
  },
  error: {
    label: '오류',
    labelEn: 'Error',
    color: 'bg-danger/20 text-danger',
    description: '오류가 발생했습니다. 다시 시도하세요',
    descriptionEn: 'An error occurred. Please try again',
  },
}

export const CSV_FILE_STATUS: Record<CsvFileStatus, StatusConfig> = {
  uploaded: {
    label: '업로드됨',
    labelEn: 'Uploaded',
    color: 'bg-subtle/30 text-muted',
    description: '파일이 업로드되었습니다',
    descriptionEn: 'File uploaded',
  },
  processing: {
    label: '처리중',
    labelEn: 'Processing',
    color: 'bg-warning/20 text-warning',
    description: '파일을 처리하고 있습니다',
    descriptionEn: 'Processing file',
  },
  ready: {
    label: '준비됨',
    labelEn: 'Ready',
    color: 'bg-success/20 text-success',
    description: '파일이 준비되었습니다',
    descriptionEn: 'File is ready',
  },
  error: {
    label: '오류',
    labelEn: 'Error',
    color: 'bg-danger/20 text-danger',
    description: '파일 처리 오류',
    descriptionEn: 'File processing error',
  },
}

// File size limits
export const CSV_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const CSV_MAX_FILES_PER_UPLOAD = 10

// Allowed MIME types
export const CSV_ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
]
