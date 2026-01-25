'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { useProjectQuery, useWorkspacesQuery } from '@/lib/react-query/queries'
import { DataSourceStatus } from './components/DataSourceStatus'
import { WorkspaceCard } from './components/WorkspaceCard'
import { AgentSlideOver } from './components/AgentSlideOver'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import type { ProjectSetupStatus } from '@/types/database'

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

function ProjectOverviewContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.pid as string
  
  // React Query hooks
  const projectQuery = useProjectQuery(projectId)
  const workspacesQuery = useWorkspacesQuery(projectId)
  
  const data = projectQuery.data || null
  const workspaces = workspacesQuery.data || []
  const loading = projectQuery.isLoading || workspacesQuery.isLoading
  const error = projectQuery.error?.message || workspacesQuery.error?.message || null
  
  const refetch = async () => {
    await Promise.all([projectQuery.refetch(), workspacesQuery.refetch()])
  }
  
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Get workspace ID from URL query
  const workspaceId = searchParams.get('workspace')

  // Show onboarding on first visit
  useEffect(() => {
    if (data && !loading) {
      const onboardingCompleted = localStorage.getItem(`onboarding_${projectId}`)
      if (!onboardingCompleted && data.project.setup_status === 'ready') {
        setShowOnboarding(true)
      }
    }
  }, [data, loading, projectId])

  // Close sidebar when workspaceId is removed from URL
  const handleCloseSidebar = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('workspace')
    router.push(`/projects/${projectId}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-0">
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 sm:px-0">
        <div className="text-center py-16 text-muted">
          <p className="mb-4">프로젝트를 찾을 수 없습니다</p>
          <Button variant="secondary" onClick={refetch}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const { project, role, ga4, csv } = data
  const currentStatusIndex = SETUP_STEPS.findIndex(s => s.status === project.setup_status)
  // Ready if GA4 or CSV is fully set up
  const isReady = project.setup_status === 'ready' || 
    (ga4.connected && ga4.property) || 
    (csv?.ingested)

  return (
    <>
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
            {/* Data Source Status - 상단에 통합 */}
            <DataSourceStatus
              ga4={{
                connected: ga4.connected,
                email: ga4.email,
                propertyName: ga4.property?.property_name,
              }}
              csv={{
                connected: csv?.ready || false,
                datasetCount: csv?.datasets.length || 0,
              }}
              projectId={projectId}
            />

            {/* Workspaces Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">워크스페이스</h2>
                  <p className="text-sm text-muted mt-1">
                    목적별 분석 워크스페이스를 선택하여 AI 분석을 시작하세요
                  </p>
                </div>
                <Link href={`/projects/${projectId}/workspaces/new`}>
                  <Button size="sm">+ 새로 만들기</Button>
                </Link>
              </div>

              {workspaces.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-border/10 text-center py-12">
                  <div className="text-subtle mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">워크스페이스가 없습니다</h3>
                  <p className="text-sm text-muted mb-4">첫 번째 워크스페이스를 만들어 분석을 시작하세요</p>
                  <Link href={`/projects/${projectId}/workspaces/new`}>
                    <Button size="sm">워크스페이스 만들기</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workspaces.map((workspace) => (
                    <WorkspaceCard
                      key={workspace.id}
                      workspace={workspace}
                      projectId={projectId}
                      ga4Connected={ga4.connected}
                      csvConnected={csv?.ready || false}
                      csvDatasetCount={csv?.datasets.length || 0}
                      onClick={() => {
                        if (workspace.status === 'ready') {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('workspace', workspace.id)
                          router.push(`/projects/${projectId}?${params.toString()}`)
                        } else {
                          router.push(`/projects/${projectId}/workspaces/${workspace.id}`)
                        }
                      }}
                    />
                  ))}
                  {/* New Workspace Card */}
                  <Link href={`/projects/${projectId}/workspaces/new`}>
                    <div className="p-6 h-full rounded-2xl border-2 border-dashed border-border/20 bg-surface-inset/30 hover:border-primary/30 hover:bg-surface-inset transition-all duration-300 flex flex-col items-center justify-center min-h-[180px]">
                      <div className="text-3xl mb-2">+</div>
                      <p className="text-sm font-medium text-foreground">새 워크스페이스</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link href={`/projects/${projectId}/setup/sources`}>
                <div className="p-6 bg-surface-inset rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                  <h3 className="font-semibold text-foreground mb-2">데이터 소스 관리</h3>
                  <p className="text-sm text-muted">GA4/CSV 데이터 소스를 추가하거나 수정하세요</p>
                </div>
              </Link>
              <Link href={`/projects/${projectId}/setup/refresh`}>
                <div className="p-6 bg-surface-inset rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                  <h3 className="font-semibold text-foreground mb-2">데이터 새로고침</h3>
                  <p className="text-sm text-muted">데이터를 최신 상태로 업데이트하세요</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Agent SlideOver */}
      {workspaceId && (
        <AgentSlideOver
          isOpen={!!workspaceId}
          onClose={handleCloseSidebar}
          workspaceId={workspaceId}
          projectId={projectId}
          ga4Connected={ga4.connected}
          csvConnected={csv?.ready || false}
          csvDatasetCount={csv?.datasets.length || 0}
        />
      )}

      {/* Onboarding BottomSheet */}
      <BottomSheet
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false)
          localStorage.setItem(`onboarding_${projectId}`, 'true')
        }}
        title="프로젝트 설정 완료! 🎉"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            프로젝트 설정이 완료되었습니다. 이제 분석을 시작할 수 있습니다.
          </p>
          <div className="space-y-3">
            <div className="p-4 bg-surface-inset rounded-xl border border-border/10">
              <h4 className="font-medium text-foreground mb-2">1. 워크스페이스 만들기</h4>
              <p className="text-sm text-muted">
                목적별로 워크스페이스를 만들어 분석을 시작하세요. 예: 제품 분석, 마케팅 분석 등
              </p>
            </div>
            <div className="p-4 bg-surface-inset rounded-xl border border-border/10">
              <h4 className="font-medium text-foreground mb-2">2. AI 분석 시작</h4>
              <p className="text-sm text-muted">
                워크스페이스를 클릭하면 오른쪽에서 AI 분석가와 대화할 수 있습니다.
              </p>
            </div>
            <div className="p-4 bg-surface-inset rounded-xl border border-border/10">
              <h4 className="font-medium text-foreground mb-2">3. 데이터 소스 확인</h4>
              <p className="text-sm text-muted">
                상단의 데이터 소스 카드에서 연결 상태를 확인하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowOnboarding(false)
                localStorage.setItem(`onboarding_${projectId}`, 'true')
              }}
            >
              확인
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowOnboarding(false)
              }}
            >
              나중에
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

export default function ProjectOverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <ProjectOverviewContent />
    </Suspense>
  )
}
