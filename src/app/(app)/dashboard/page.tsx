'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import type { ProjectWithRole, ProjectSetupStatus } from '@/types/database'

const STATUS_LABELS: Record<ProjectSetupStatus, { label: string; color: string }> = {
  draft: { label: '프로필 설정 필요', color: 'bg-subtle/30 text-muted' },
  profile_ready: { label: 'GA4 연동 필요', color: 'bg-warning/20 text-warning' },
  ga4_ready: { label: '데이터 동기화 필요', color: 'bg-info/20 text-info' },
  ready: { label: '분석 가능', color: 'bg-success/20 text-success' },
}

// 스피너
function Spinner() {
  return (
    <div className="h-8 w-8 relative">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">프로젝트</h1>
          <p className="text-muted mt-1">데이터 분석을 위한 프로젝트를 관리하세요</p>
        </div>
        <Link href="/projects/new">
          <Button>+ 새 프로젝트</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border/10 text-center py-16">
          <div className="text-subtle mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">프로젝트가 없습니다</h3>
          <p className="text-muted mb-6">첫 번째 프로젝트를 만들어 데이터 분석을 시작하세요</p>
          <Link href="/projects/new">
            <Button>프로젝트 만들기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = STATUS_LABELS[project.setup_status || 'draft']
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="p-6 h-full bg-surface rounded-2xl border border-border/10 hover:border-border/30 hover:bg-surface-strong transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {(project.profile as { serviceDescription?: string })?.serviceDescription || '설명 없음'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-subtle">
                    <span className="capitalize">{project.role}</span>
                    <span>{new Date(project.created_at!).toLocaleDateString()}</span>
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
