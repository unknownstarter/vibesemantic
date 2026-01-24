'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { GA4Icon, CsvIcon, PlusIcon, CheckIcon } from '@/shared/ui/Icons'
import { CSV_DATASET_STATUS } from '@/entities/csv/constants'
import type { CsvDataset } from '@/types/database'

interface DatasetWithFiles extends CsvDataset {
  csv_files?: Array<{ id: string; original_filename: string; status: string; is_active: boolean }>
  source_mappings?: { id: string; status: string } | null
}

interface GA4Status {
  connected: boolean
  email?: string
  property?: { property_id: string; property_name: string }
}

export default function SourcesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.pid as string

  const [datasets, setDatasets] = useState<DatasetWithFiles[]>([])
  const [ga4Status, setGa4Status] = useState<GA4Status>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newDatasetName, setNewDatasetName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Fetch data sources
  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}/csv/datasets`).then(r => r.json()),
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
    ])
      .then(([datasetsRes, projectRes]) => {
        setDatasets(datasetsRes.datasets || [])
        setGa4Status(projectRes.ga4 || { connected: false })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  // Create new dataset
  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return

    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/csv/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDatasetName.trim() }),
      })

      if (res.ok) {
        const { dataset } = await res.json()
        router.push(`/projects/${projectId}/setup/csv/datasets/${dataset.id}`)
      }
    } catch (error) {
      console.error('Failed to create dataset:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  const hasGA4 = ga4Status.connected
  const hasCSV = datasets.some(d => d.status === 'confirmed' || d.status === 'ingested')

  return (
    <div className="px-4 sm:px-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href={`/projects/${projectId}`} className="hover:text-foreground transition">프로젝트</Link>
          <span>/</span>
          <span className="text-foreground">데이터 소스 설정</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">데이터 소스</h1>
        <p className="text-muted mt-1">GA4 또는 CSV를 연결하여 분석 데이터를 준비하세요</p>
      </div>

      {/* Source Status Summary */}
      {(hasGA4 || hasCSV) && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 text-success">
            <CheckIcon className="w-5 h-5" />
            <span className="font-medium">
              데이터 소스 연결됨
              {hasGA4 && hasCSV ? ' (GA4 + CSV)' : hasGA4 ? ' (GA4)' : ' (CSV)'}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            워크스페이스에서 분석을 시작할 수 있습니다
          </p>
        </div>
      )}

      {/* GA4 Section */}
      <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <GA4Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">Google Analytics 4</h2>
              {hasGA4 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">연결됨</span>
              )}
            </div>
            <p className="text-sm text-muted mb-4">
              실시간 웹/앱 분석 데이터를 자동으로 가져옵니다
            </p>

            {hasGA4 ? (
              <div className="p-4 bg-surface-inset rounded-xl">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted">연결된 계정</span>
                  <span className="text-foreground">{ga4Status.email}</span>
                </div>
                {ga4Status.property && (
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-muted">Property</span>
                    <span className="text-foreground">{ga4Status.property.property_name}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border/10">
                  <Link href={`/projects/${projectId}/setup/ga4/connect`}>
                    <Button variant="secondary" size="sm">연결 관리</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Link href={`/projects/${projectId}/setup/ga4/connect`}>
                <Button>GA4 연결하기</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* CSV Section */}
      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CsvIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">CSV 데이터셋</h2>
              {hasCSV && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">
                  {datasets.filter(d => d.status === 'ingested').length}개 활성
                </span>
              )}
            </div>
            <p className="text-sm text-muted mb-4">
              CSV 파일을 업로드하여 커스텀 데이터를 분석합니다
            </p>

            {/* Dataset List */}
            {datasets.length > 0 && (
              <div className="space-y-3 mb-4">
                {datasets.map((dataset) => {
                  const statusConfig = CSV_DATASET_STATUS[dataset.status]
                  const fileCount = dataset.csv_files?.filter(f => f.is_active).length || 0

                  return (
                    <Link
                      key={dataset.id}
                      href={`/projects/${projectId}/setup/csv/datasets/${dataset.id}`}
                    >
                      <div className="p-4 bg-surface-inset rounded-xl border border-border/10 hover:border-border/30 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-foreground">{dataset.name}</h3>
                            <p className="text-xs text-muted mt-1">
                              {fileCount}개 파일 · {new Date(dataset.created_at!).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Create Dataset Form */}
            {showCreateForm ? (
              <div className="p-4 bg-surface-inset rounded-xl border border-primary/30">
                <label className="block text-sm font-medium text-foreground mb-2">
                  데이터셋 이름
                </label>
                <input
                  type="text"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder="예: 매출 데이터"
                  className="w-full px-4 py-2 bg-surface border border-border/10 rounded-lg 
                           text-foreground placeholder:text-subtle
                           focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40
                           transition-all duration-200"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleCreateDataset}
                    disabled={!newDatasetName.trim() || creating}
                  >
                    {creating ? <Spinner size="sm" className="mr-2" /> : null}
                    생성하기
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewDatasetName('')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowCreateForm(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                새 데이터셋 추가
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      {(hasGA4 || hasCSV) && (
        <div className="mt-8 text-center">
          <Link href={`/projects/${projectId}`}>
            <Button>프로젝트로 돌아가기</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
