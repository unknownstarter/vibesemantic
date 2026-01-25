'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import { AccessRequestDialog } from '@/shared/ui/AccessRequestDialog'
import { createClient } from '@/lib/supabase/client'
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
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessLevel, setAccessLevel] = useState<string | null>(null)
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  // Check user access level
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setUserEmail(user.email || null)
          
          // Check access level
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('access_level')
            .eq('user_id', user.id)
            .single()
          
          const level = (profile as { access_level?: string } | null)?.access_level || 'pending'
          setAccessLevel(level)
          
          // If not approved, show dialog when trying to create project
          if (level !== 'approved') {
            // Don't auto-show, wait for user action
          }
        }
      } catch (error) {
        console.error('Failed to check access:', error)
      } finally {
        setCheckingAccess(false)
      }
    }
    
    checkAccess()
  }, [])

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Show access dialog if redirected from projects/new
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('access_required') === 'true') {
      setShowAccessDialog(true)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
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
        <Button
          onClick={() => {
            if (accessLevel === 'approved') {
              window.location.href = '/projects/new'
            } else {
              setShowAccessDialog(true)
            }
          }}
        >
          + 새 프로젝트
        </Button>
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
          <Button
            onClick={() => {
              if (accessLevel === 'approved') {
                window.location.href = '/projects/new'
              } else {
                setShowAccessDialog(true)
              }
            }}
          >
            프로젝트 만들기
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = STATUS_LABELS[project.setup_status || 'draft']
            return (
              <div
                key={project.id}
                onClick={() => {
                  if (accessLevel === 'approved') {
                    window.location.href = `/projects/${project.id}`
                  } else {
                    setShowAccessDialog(true)
                  }
                }}
                className="cursor-pointer"
              >
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
              </div>
            )
          })}
        </div>
      )}

      <AccessRequestDialog
        isOpen={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        userEmail={userEmail || undefined}
      />
    </div>
  )
}
