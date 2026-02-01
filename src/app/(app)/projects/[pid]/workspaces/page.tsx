'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import { Breadcrumb } from '@/shared/ui/Breadcrumb'
import type { Workspace, WorkspacePurpose, WorkspaceStatus } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const PURPOSE_LABELS: Record<WorkspacePurpose, { label: string; color: string; icon: string }> = {
  product: { label: '프로덕트', color: 'bg-primary/20 text-primary', icon: '📦' },
  marketing: { label: '마케팅', color: 'bg-primary/20 text-primary', icon: '📢' },
  biz: { label: '비즈니스', color: 'bg-success/20 text-success', icon: '📊' },
  sales: { label: '세일즈', color: 'bg-warning/20 text-warning', icon: '💼' },
}

const STATUS_LABELS: Record<WorkspaceStatus, { label: string; color: string }> = {
  draft: { label: '설정 필요', color: 'text-warning' },
  ready: { label: '분석 가능', color: 'text-success' },
  error: { label: '오류', color: 'text-danger' },
}

export default function WorkspacesPage() {
  const params = useParams()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}/workspaces`)
      .then(res => res.json())
      .then(data => {
        setWorkspaces(data.workspaces || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectSlug])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Breadcrumb
            items={[
              { label: '프로젝트', href: '/dashboard' },
              { label: 'Overview', href: `/projects/${projectSlug}` },
              { label: '워크스페이스' },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-foreground">워크스페이스</h1>
          <p className="text-muted mt-1">목적별 분석 워크스페이스를 관리하세요</p>
        </div>
        <Link href={`/projects/${projectSlug}/workspaces/new`}>
          <Button>+ 새 워크스페이스</Button>
        </Link>
      </div>

      {workspaces.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border/10 text-center py-16">
          <div className="text-subtle mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">워크스페이스가 없습니다</h3>
          <p className="text-muted mb-6">첫 번째 워크스페이스를 만들어 분석을 시작하세요</p>
          <Link href={`/projects/${projectSlug}/workspaces/new`}>
            <Button>워크스페이스 만들기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workspaces.map((workspace) => {
            const purpose = PURPOSE_LABELS[workspace.purpose]
            const status = STATUS_LABELS[workspace.status]
            const href = workspace.status === 'ready'
              ? `/projects/${projectSlug}/workspaces/${workspace.id}/agent`
              : `/projects/${projectSlug}/workspaces/${workspace.id}`

            return (
              <Link key={workspace.id} href={href}>
                <div className="p-6 h-full bg-surface rounded-2xl border border-border/10 hover:border-border/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{purpose.icon}</span>
                      <h3 className="font-semibold text-foreground">{workspace.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${purpose.color}`}>
                      {purpose.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={status.color}>{status.label}</span>
                    <span className="text-subtle">
                      {new Date(workspace.created_at!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
