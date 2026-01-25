'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/ui/Button'
import type { Project, MemberRole } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility

  const [project, setProject] = useState<Project | null>(null)
  const [role, setRole] = useState<MemberRole | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Use the actual slug from project data for navigation
  const slug = project?.slug || projectSlug

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(res => res.json())
      .then(data => {
        setProject(data.project)
        setRole(data.role)
        setName(data.project?.name || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectSlug])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    try {
      const res = await fetch(`/api/projects/${projectSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) throw new Error('Failed to save')

      router.push(`/projects/${slug}`)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const res = await fetch(`/api/projects/${projectSlug}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!project) {
    return <div className="text-center py-16 text-muted">프로젝트를 찾을 수 없습니다</div>
  }

  const canEdit = role === 'owner'
  const isOwner = role === 'owner'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href={`/projects/${slug}`} className="hover:text-foreground transition">
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">설정</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">프로젝트 설정</h1>
      </div>

      {/* General Settings */}
      <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">일반</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            프로젝트 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || name === project.name}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                저장 중...
              </span>
            ) : (
              '저장'
            )}
          </Button>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-surface rounded-2xl border border-border/10 p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">설정 바로가기</h2>
        <div className="space-y-2">
          <Link
            href={`/projects/${slug}/setup/profile`}
            className="block p-4 rounded-xl bg-surface-inset border border-border/10 hover:border-border/30 transition"
          >
            <div className="font-medium text-foreground">서비스 프로필</div>
            <div className="text-sm text-muted">서비스 정보 및 분석 설정</div>
          </Link>
          <Link
            href={`/projects/${slug}/setup/ga4/connect`}
            className="block p-4 rounded-xl bg-surface-inset border border-border/10 hover:border-border/30 transition"
          >
            <div className="font-medium text-foreground">GA4 연동</div>
            <div className="text-sm text-muted">Google Analytics 연결 관리</div>
          </Link>
          <Link
            href={`/projects/${slug}/setup/refresh`}
            className="block p-4 rounded-xl bg-surface-inset border border-border/10 hover:border-border/30 transition"
          >
            <div className="font-medium text-foreground">데이터 동기화</div>
            <div className="text-sm text-muted">GA4 데이터 새로고침</div>
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-surface rounded-2xl border border-danger/30 p-6">
          <h2 className="text-lg font-semibold text-danger mb-4">위험 영역</h2>
          
          <div className="p-4 bg-danger/10 rounded-xl border border-danger/20">
            <h3 className="font-medium text-foreground mb-2">프로젝트 삭제</h3>
            <p className="text-sm text-muted mb-4">
              프로젝트와 관련된 모든 데이터(워크스페이스, 분석 기록, 리포트)가 영구적으로 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            
            {showDeleteConfirm ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50 transition"
                >
                  {deleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-4 w-4" />
                      삭제 중...
                    </span>
                  ) : (
                    '정말 삭제'
                  )}
                </button>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  취소
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-danger/50 text-danger rounded-lg hover:bg-danger/10 transition"
              >
                프로젝트 삭제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
