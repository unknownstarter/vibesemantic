'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import type { Project, MemberRole, ProjectSetupStatus } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

interface ProjectData {
  project: Project
  role: MemberRole
  ga4: {
    connected: boolean
    email?: string
    property?: { property_id: string; property_name: string }
  }
  csv?: {
    datasets: Array<{ id: string; name: string; status: string }>
    ready: boolean
    ingested: boolean
  }
}

const SETUP_STEPS: Array<{
  status: ProjectSetupStatus
  label: string
  description: string
  action: string
  href: (pid: string) => string
}> = [
  {
    status: 'draft',
    label: '1. 서비스 프로필 설정',
    description: '분석할 서비스의 기본 정보를 입력하세요',
    action: '프로필 설정하기',
    href: (pid) => `/projects/${pid}/setup/profile`,
  },
  {
    status: 'profile_ready',
    label: '2. 데이터 소스 연결',
    description: 'GA4 또는 CSV 데이터를 연결하세요',
    action: '데이터 소스 설정',
    href: (pid) => `/projects/${pid}/setup/sources`,
  },
  {
    status: 'ga4_ready',
    label: '3. 데이터 동기화',
    description: '데이터를 가져와 분석을 시작하세요',
    action: '데이터 동기화',
    href: (pid) => `/projects/${pid}/setup/refresh`,
  },
]

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.pid as string
  const [data, setData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-16 text-muted">프로젝트를 찾을 수 없습니다</div>
  }

  const { project, role, ga4, csv } = data
  const currentStatusIndex = SETUP_STEPS.findIndex(s => s.status === project.setup_status)
  // Ready if GA4 or CSV is fully set up
  const isReady = project.setup_status === 'ready' || 
    (ga4.connected && ga4.property) || 
    (csv?.ingested)

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard" className="hover:text-foreground transition">프로젝트</Link>
          <span>/</span>
          <span className="text-foreground">{project.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted mt-1">
              {(project.profile as { serviceDescription?: string })?.serviceDescription || '설명 없음'}
            </p>
          </div>
          {role === 'owner' && (
            <Link href={`/projects/${projectId}/settings`}>
              <Button variant="secondary" size="sm">설정</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Setup Progress or Ready State */}
      {!isReady ? (
        <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">프로젝트 설정</h2>
          <div className="space-y-4">
            {SETUP_STEPS.map((step, index) => {
              const isCompleted = index < currentStatusIndex || (index === currentStatusIndex && step.status !== project.setup_status)
              const isCurrent = step.status === project.setup_status
              const isLocked = index > currentStatusIndex

              return (
                <div
                  key={step.status}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border ${
                    isCurrent ? 'border-primary/30 bg-primary/5' :
                    isCompleted ? 'border-success/30 bg-success/5' :
                    'border-border/10 bg-surface-inset/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    isCompleted ? 'bg-success text-background' :
                    isCurrent ? 'bg-primary text-background' :
                    'bg-subtle/30 text-muted'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${isCurrent ? 'text-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </h3>
                    <p className="text-sm text-muted">{step.description}</p>
                  </div>
                  {isCurrent && !isLocked && role === 'owner' && (
                    <Link href={step.href(projectId)}>
                      <Button size="sm">{step.action}</Button>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Link href={`/projects/${projectId}/workspaces`}>
              <div className="p-6 h-full bg-surface-inset rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                <h3 className="font-semibold text-foreground mb-2">워크스페이스</h3>
                <p className="text-sm text-muted">목적별 분석 워크스페이스를 관리하세요</p>
              </div>
            </Link>
            <Link href={`/projects/${projectId}/setup/sources`}>
              <div className="p-6 h-full bg-surface-inset rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                <h3 className="font-semibold text-foreground mb-2">데이터 소스</h3>
                <p className="text-sm text-muted">GA4/CSV 데이터 소스를 관리하세요</p>
              </div>
            </Link>
            <Link href={`/projects/${projectId}/setup/refresh`}>
              <div className="p-6 h-full bg-surface-inset rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                <h3 className="font-semibold text-foreground mb-2">데이터 새로고침</h3>
                <p className="text-sm text-muted">데이터를 최신 상태로 업데이트하세요</p>
              </div>
            </Link>
          </div>

          {/* Data Source Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* GA4 Info */}
            {ga4.connected && (
              <div className="bg-surface rounded-2xl border border-border/10 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">GA4 연결 정보</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/10">
                    <span className="text-muted">연결된 계정</span>
                    <span className="text-foreground">{ga4.email}</span>
                  </div>
                  {ga4.property && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted">선택된 Property</span>
                      <span className="text-foreground">{ga4.property.property_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CSV Info */}
            {csv && csv.datasets.length > 0 && (
              <div className="bg-surface rounded-2xl border border-border/10 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">CSV 데이터셋</h2>
                <div className="space-y-2">
                  {csv.datasets.slice(0, 3).map((dataset) => (
                    <div key={dataset.id} className="flex justify-between items-center py-2 border-b border-border/10 last:border-0">
                      <span className="text-foreground">{dataset.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        dataset.status === 'ingested' ? 'bg-success/20 text-success' :
                        dataset.status === 'confirmed' ? 'bg-primary/20 text-primary' :
                        'bg-subtle/30 text-muted'
                      }`}>
                        {dataset.status === 'ingested' ? '완료' : 
                         dataset.status === 'confirmed' ? '확정' : '대기'}
                      </span>
                    </div>
                  ))}
                  {csv.datasets.length > 3 && (
                    <p className="text-xs text-muted mt-2">
                      외 {csv.datasets.length - 3}개 더보기
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
