'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import { Breadcrumb } from '@/shared/ui/Breadcrumb'
import { Spinner } from '@/shared/ui/Spinner'
import { UploadIcon, FileIcon, TrashIcon, CheckIcon, PlusIcon } from '@/shared/ui/Icons'
import { CSV_DATASET_STATUS } from '@/entities/csv/constants'
import type { CsvDataset, CsvFile, MetricColumn, DimensionColumn, LLMQuestion, QuickReply } from '@/types/database'

// EditIcon for manual editing
function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

interface DatasetDetail extends CsvDataset {
  csv_files: CsvFile[]
  source_mappings: {
    id: string
    status: string
    date_column: string | null
    metric_columns: MetricColumn[]
    dimension_columns: DimensionColumn[]
    llm_questions: LLMQuestion[]
  } | null
}

export default function DatasetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility
  const datasetId = params.datasetId as string

  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [probing, setProbing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Manual editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editDateColumn, setEditDateColumn] = useState<string | null>(null)
  const [editMetricColumns, setEditMetricColumns] = useState<MetricColumn[]>([])
  const [editDimensionColumns, setEditDimensionColumns] = useState<DimensionColumn[]>([])
  
  // Available columns from CSV headers
  const [availableColumns, setAvailableColumns] = useState<string[]>([])

  // Fetch dataset
  const fetchDataset = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}`)
      const data = await res.json()
      setDataset(data.dataset)
      
      // Set available columns from first file's headers
      if (data.dataset?.csv_files?.[0]?.headers) {
        setAvailableColumns(data.dataset.csv_files[0].headers as string[])
      }
      
      // Initialize edit state from current mapping
      if (data.dataset?.source_mappings) {
        setEditDateColumn(data.dataset.source_mappings.date_column)
        setEditMetricColumns(data.dataset.source_mappings.metric_columns || [])
        setEditDimensionColumns(data.dataset.source_mappings.dimension_columns || [])
      }
    } catch {
      setError('데이터셋을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [projectSlug, datasetId])

  useEffect(() => {
    fetchDataset()
  }, [fetchDataset])

  // File upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '업로드 실패')
      }

      await fetchDataset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  // Probe handler
  const handleProbe = async () => {
    setProbing(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'ko' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Probe 실패')
      }

      await fetchDataset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '스키마 분석 실패')
    } finally {
      setProbing(false)
    }
  }

  // Quick Reply handler - applies the action and updates mapping
  const handleQuickReply = (question: LLMQuestion, reply: QuickReply) => {
    setError(null)
    
    // Handle different action types - 즉시 UI 업데이트 (저장은 나중에 확인 버튼에서)
    if (reply.action === 'set_date_column') {
      setEditDateColumn(reply.value)
    } else if (reply.action === 'add_metric') {
      // 중복 체크: 이미 추가된 컬럼은 무시
      if (editMetricColumns.some(m => m.name === reply.value)) {
        return
      }
      const newMetric: MetricColumn = {
        name: reply.value,
        displayName: reply.value,
        type: 'number',
        aggregation: 'sum',
      }
      setEditMetricColumns([...editMetricColumns, newMetric])
    } else if (reply.action === 'add_dimension') {
      // 중복 체크: 이미 추가된 컬럼은 무시
      if (editDimensionColumns.some(d => d.name === reply.value)) {
        return
      }
      const newDim: DimensionColumn = {
        name: reply.value,
        displayName: reply.value,
        type: 'string',
      }
      setEditDimensionColumns([...editDimensionColumns, newDim])
    } else if (reply.action === 'remove_metric') {
      setEditMetricColumns(editMetricColumns.filter(m => m.name !== reply.value))
    } else if (reply.action === 'remove_dimension') {
      setEditDimensionColumns(editDimensionColumns.filter(d => d.name !== reply.value))
    }
    
    // 편집 모드로 전환하여 변경사항이 표시되도록
    if (!isEditing) {
      setIsEditing(true)
    }
  }
  
  // Save mapping changes (partial update)
  const saveMapping = async (updates: {
    dateColumn?: string | null
    metricColumns?: MetricColumn[]
    dimensionColumns?: DimensionColumn[]
  }) => {
    if (!dataset?.source_mappings?.id) return
    
    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          // Don't confirm yet, just update
          _updateOnly: true,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '저장 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '매핑 저장 실패')
    }
  }

  // Confirm handler (with optional edits)
  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateColumn: editDateColumn,
          metricColumns: editMetricColumns,
          dimensionColumns: editDimensionColumns,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Confirm 실패')
      }

      setIsEditing(false)
      await fetchDataset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '매핑 확정 실패')
    } finally {
      setConfirming(false)
    }
  }

  // Ingest handler
  const handleIngest = async () => {
    setIngesting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}/ingest`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ingest 실패')
      }

      await fetchDataset()
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 적재 실패')
    } finally {
      setIngesting(false)
    }
  }

  // Delete dataset handler
  const handleDelete = async () => {
    if (!confirm('이 데이터셋을 삭제하시겠습니까? 모든 파일과 데이터가 영구 삭제됩니다.')) return

    try {
      await fetch(`/api/projects/${projectSlug}/csv/datasets/${datasetId}`, {
        method: 'DELETE',
      })
      router.push(`/projects/${projectSlug}/setup/sources`)
    } catch {
      setError('삭제 실패')
    }
  }
  
  // Manual editing helpers
  const handleAddMetric = (columnName: string) => {
    if (editMetricColumns.some(m => m.name === columnName)) return
    const newMetric: MetricColumn = {
      name: columnName,
      displayName: columnName,
      type: 'number',
      aggregation: 'sum',
    }
    setEditMetricColumns([...editMetricColumns, newMetric])
  }
  
  const handleRemoveMetric = (columnName: string) => {
    setEditMetricColumns(editMetricColumns.filter(m => m.name !== columnName))
  }
  
  const handleAddDimension = (columnName: string) => {
    if (editDimensionColumns.some(d => d.name === columnName)) return
    const newDim: DimensionColumn = {
      name: columnName,
      displayName: columnName,
      type: 'string',
    }
    setEditDimensionColumns([...editDimensionColumns, newDim])
  }
  
  const handleRemoveDimension = (columnName: string) => {
    setEditDimensionColumns(editDimensionColumns.filter(d => d.name !== columnName))
  }
  
  // Get unused columns (not assigned to date, metrics, or dimensions)
  const getUnusedColumns = () => {
    const usedColumns = new Set<string>()
    if (editDateColumn) usedColumns.add(editDateColumn)
    editMetricColumns.forEach(m => usedColumns.add(m.name))
    editDimensionColumns.forEach(d => usedColumns.add(d.name))
    return availableColumns.filter(c => !usedColumns.has(c))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!dataset) {
    return <div className="text-center py-16 text-muted">데이터셋을 찾을 수 없습니다</div>
  }

  const statusConfig = CSV_DATASET_STATUS[dataset.status]
  const hasFiles = dataset.csv_files.length > 0
  const hasMapping = dataset.source_mappings !== null
  const isConfirmed = dataset.status === 'confirmed' || dataset.status === 'ingested'

  return (
    <div className="px-4 sm:px-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: '데이터 소스', href: `/projects/${projectSlug}/setup/sources` },
            { label: dataset.name },
          ]}
          className="mb-2"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{dataset.name}</h1>
              <span className={`px-2 py-0.5 text-xs rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-muted mt-1">{statusConfig.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <TrashIcon className="w-4 h-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 mb-6">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: File Upload */}
      <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            hasFiles ? 'bg-success text-background' : 'bg-primary text-background'
          }`}>
            {hasFiles ? <CheckIcon className="w-4 h-4" /> : '1'}
          </div>
          <h2 className="text-lg font-semibold text-foreground">CSV 파일 업로드</h2>
        </div>

        {/* File List */}
        {dataset.csv_files.length > 0 && (
          <div className="space-y-2 mb-4">
            {dataset.csv_files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-surface-inset rounded-lg"
              >
                <FileIcon className="w-5 h-5 text-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-muted">
                    {file.row_count?.toLocaleString()}행 · {file.column_count}열
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  file.status === 'ready' ? 'bg-success/20 text-success' : 'bg-subtle/30 text-muted'
                }`}>
                  {file.status === 'ready' ? '준비됨' : file.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <label className="block">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            uploading ? 'border-primary/50 bg-primary/5' : 'border-border/30 hover:border-primary/50 hover:bg-surface-inset'
          }`}>
            {uploading ? (
              <Spinner size="lg" className="mx-auto text-primary" />
            ) : (
              <>
                <UploadIcon className="w-10 h-10 mx-auto text-muted mb-3" />
                <p className="text-foreground font-medium">CSV 또는 Excel(.xlsx, .xls) 파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-sm text-muted mt-1">여러 파일을 한 번에 업로드할 수 있습니다</p>
              </>
            )}
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Step 2: Schema Probe */}
      {hasFiles && (
        <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                hasMapping ? 'bg-success text-background' : 
                dataset.status === 'probing' ? 'bg-warning text-background' :
                'bg-primary text-background'
              }`}>
                {hasMapping ? <CheckIcon className="w-4 h-4" /> : '2'}
              </div>
              <h2 className="text-lg font-semibold text-foreground">스키마 분석</h2>
            </div>
            
            {/* Manual Edit Toggle */}
            {hasMapping && !isConfirmed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <EditIcon className="w-4 h-4 mr-2" />
                {isEditing ? '편집 취소' : '수동 편집'}
              </Button>
            )}
          </div>

          {hasMapping && dataset.source_mappings ? (
            <div className="space-y-4">
              {/* Date Column */}
              <div className="p-4 bg-surface-inset rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wide mb-2">날짜 컬럼</p>
                {isEditing ? (
                  <select
                    value={editDateColumn || ''}
                    onChange={(e) => setEditDateColumn(e.target.value || null)}
                    className="w-full px-3 py-2 bg-surface border border-border/30 rounded-lg text-foreground"
                  >
                    <option value="">(미지정)</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-foreground font-medium">
                    {dataset.source_mappings?.date_column || '(미지정)'}
                  </p>
                )}
              </div>

              {/* Metric Columns */}
              <div className="p-4 bg-surface-inset rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-muted uppercase tracking-wide">
                    지표 컬럼 ({isEditing ? editMetricColumns.length : (dataset.source_mappings?.metric_columns?.length || 0)}개)
                  </p>
                  <span className="text-xs text-muted/70">• 숫자 데이터 (매출, 세션, 전환율 등)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? editMetricColumns : (dataset.source_mappings?.metric_columns || [])).map((col) => (
                    <span 
                      key={col.name} 
                      className={`px-2 py-1 text-sm bg-primary/10 text-primary rounded flex items-center gap-1 ${
                        isEditing ? 'pr-1' : ''
                      }`}
                    >
                      {col.displayName || col.name}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveMetric(col.name)}
                          className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <div className="relative group">
                      <button className="px-2 py-1 text-sm border border-dashed border-primary/30 text-primary rounded flex items-center gap-1 hover:bg-primary/5">
                        <PlusIcon className="w-3 h-3" /> {getUnusedColumns().length > 0 ? `추가 (${getUnusedColumns().length}개)` : '모두 추가됨'}
                      </button>
                      {getUnusedColumns().length > 0 && (
                        <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-10 bg-surface border border-border/30 rounded-lg shadow-lg max-h-60 overflow-auto min-w-[200px]">
                          <div className="p-2 border-b border-border/10">
                            <p className="text-xs text-muted">사용 가능한 컬럼 ({getUnusedColumns().length}개)</p>
                          </div>
                          {getUnusedColumns().map(col => (
                            <button
                              key={col}
                              onClick={() => handleAddMetric(col)}
                              className="block w-full px-3 py-2 text-sm text-left hover:bg-surface-inset border-b border-border/5 last:border-0"
                            >
                              {col}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dimension Columns */}
              <div className="p-4 bg-surface-inset rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-muted uppercase tracking-wide">
                    차원 컬럼 ({isEditing ? editDimensionColumns.length : (dataset.source_mappings?.dimension_columns?.length || 0)}개)
                  </p>
                  <span className="text-xs text-muted/70">• 그룹화 기준 (채널, 국가, 카테고리 등)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? editDimensionColumns : (dataset.source_mappings?.dimension_columns || [])).map((col) => (
                    <span 
                      key={col.name} 
                      className={`px-2 py-1 text-sm bg-subtle/30 text-muted rounded flex items-center gap-1 ${
                        isEditing ? 'pr-1' : ''
                      }`}
                    >
                      {col.displayName || col.name}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveDimension(col.name)}
                          className="ml-1 p-0.5 hover:bg-subtle/50 rounded"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <div className="relative group">
                      <button className="px-2 py-1 text-sm border border-dashed border-subtle/50 text-muted rounded flex items-center gap-1 hover:bg-subtle/10">
                        <PlusIcon className="w-3 h-3" /> {getUnusedColumns().length > 0 ? `추가 (${getUnusedColumns().length}개)` : '모두 추가됨'}
                      </button>
                      {getUnusedColumns().length > 0 && (
                        <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-10 bg-surface border border-border/30 rounded-lg shadow-lg max-h-60 overflow-auto min-w-[200px]">
                          <div className="p-2 border-b border-border/10">
                            <p className="text-xs text-muted">사용 가능한 컬럼 ({getUnusedColumns().length}개)</p>
                          </div>
                          {getUnusedColumns().map(col => (
                            <button
                              key={col}
                              onClick={() => handleAddDimension(col)}
                              className="block w-full px-3 py-2 text-sm text-left hover:bg-surface-inset border-b border-border/5 last:border-0"
                            >
                              {col}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* LLM Questions with Quick Reply */}
              {dataset.source_mappings?.llm_questions && dataset.source_mappings.llm_questions.length > 0 && !isConfirmed && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                  <p className="text-xs text-warning uppercase tracking-wide mb-2">확인 필요</p>
                  {dataset.source_mappings.llm_questions.map((q) => (
                    <div key={q.id} className="mb-3 last:mb-0">
                      <p className="text-foreground text-sm mb-2">{q.question}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.quickReplies.map((reply) => {
                          // 이미 추가된 컬럼인지 확인 (편집 모드일 때는 editMetricColumns, 아닐 때는 dataset.source_mappings 사용)
                          const currentMetrics = isEditing ? editMetricColumns : (dataset.source_mappings?.metric_columns || [])
                          const currentDimensions = isEditing ? editDimensionColumns : (dataset.source_mappings?.dimension_columns || [])
                          const currentDateColumn = isEditing ? editDateColumn : (dataset.source_mappings?.date_column || null)
                          
                          const isAdded = 
                            (reply.action === 'add_metric' && currentMetrics.some(m => m.name === reply.value)) ||
                            (reply.action === 'add_dimension' && currentDimensions.some(d => d.name === reply.value)) ||
                            (reply.action === 'set_date_column' && currentDateColumn === reply.value)
                          
                          return (
                            <button
                              key={reply.value}
                              onClick={() => handleQuickReply(q, reply)}
                              disabled={isAdded}
                              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                                isAdded
                                  ? 'bg-primary/20 text-primary border border-primary/50 cursor-not-allowed opacity-60'
                                  : 'bg-surface border border-border/30 hover:bg-surface-inset hover:border-primary/50'
                              }`}
                            >
                              {reply.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Re-probe button */}
              {!isConfirmed && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleProbe}
                    disabled={probing}
                  >
                    {probing ? <Spinner size="sm" className="mr-2" /> : null}
                    다시 분석하기
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted mb-4">
                AI가 CSV 스키마를 분석하고 날짜/지표/차원 컬럼을 자동으로 매핑합니다
              </p>
              <Button onClick={handleProbe} disabled={probing}>
                {probing ? <Spinner size="sm" className="mr-2" /> : null}
                스키마 분석 시작
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm & Ingest */}
      {hasMapping && dataset.source_mappings?.status === 'draft' && (
        <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-background">
              3
            </div>
            <h2 className="text-lg font-semibold text-foreground">매핑 확정</h2>
          </div>
          <p className="text-muted mb-4">
            {isEditing 
              ? '변경사항을 저장하고 매핑을 확정합니다.'
              : '스키마 매핑이 올바른지 확인하고 확정하세요. 확정 후에는 데이터 적재가 가능합니다.'
            }
          </p>
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming ? <Spinner size="sm" className="mr-2" /> : <CheckIcon className="w-4 h-4 mr-2" />}
            {isEditing ? '변경사항 저장 및 확정' : '매핑 확정하기'}
          </Button>
        </div>
      )}

      {/* Step 4: Ingest */}
      {isConfirmed && (
        <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              dataset.status === 'ingested' ? 'bg-success text-background' : 'bg-primary text-background'
            }`}>
              {dataset.status === 'ingested' ? <CheckIcon className="w-4 h-4" /> : '4'}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {dataset.status === 'ingested' ? '데이터 적재 완료' : '데이터 적재'}
            </h2>
          </div>

          {dataset.status === 'ingested' ? (
            <div className="text-center py-4">
              <p className="text-success mb-4">데이터가 성공적으로 적재되었습니다!</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleIngest} variant="secondary" disabled={ingesting}>
                  {ingesting ? <Spinner size="sm" className="mr-2" /> : null}
                  데이터 새로고침
                </Button>
                <Link href={`/projects/${projectSlug}`}>
                  <Button>프로젝트로 이동</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted mb-4">
                확정된 매핑을 사용하여 모든 CSV 파일의 데이터를 분석용 테이블에 적재합니다.
              </p>
              <Button onClick={handleIngest} disabled={ingesting}>
                {ingesting ? <Spinner size="sm" className="mr-2" /> : null}
                데이터 적재 시작
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
