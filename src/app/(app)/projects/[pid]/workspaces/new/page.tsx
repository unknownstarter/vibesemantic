'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import { Breadcrumb } from '@/shared/ui/Breadcrumb'
import type { WorkspacePurpose } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const PURPOSES: Array<{
  value: WorkspacePurpose
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'product',
    label: '프로덕트',
    description: '사용자 행동 및 제품 사용성 분석',
    icon: '📦',
  },
  {
    value: 'marketing',
    label: '마케팅',
    description: '채널별 성과 및 캠페인 효율 분석',
    icon: '📢',
  },
  {
    value: 'biz',
    label: '비즈니스',
    description: '비즈니스 KPI 및 성장 지표 분석',
    icon: '📊',
  },
  {
    value: 'sales',
    label: '세일즈',
    description: '리드 생성 및 전환 분석',
    icon: '💼',
  },
]

export default function NewWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility

  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState<WorkspacePurpose>('product')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/projects/${projectSlug}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), purpose }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace')
      }

      // Use the returned workspace slug for navigation
      router.push(`/projects/${projectSlug}/workspaces/${data.workspace.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: '워크스페이스', href: `/projects/${projectSlug}/workspaces` },
            { label: '새로 만들기' },
          ]}
          className="mb-2"
        />
        <h1 className="text-2xl font-bold text-foreground">새 워크스페이스</h1>
        <p className="text-muted mt-1">분석 목적에 맞는 워크스페이스를 생성하세요</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              워크스페이스 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              placeholder="예: 마케팅 주간 분석"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              분석 목적 *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPurpose(p.value)}
                  className={`p-4 rounded-xl border text-left transition ${
                    purpose === p.value
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/10 hover:border-border/30 bg-surface-inset'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{p.icon}</span>
                    <span className="font-medium text-foreground">{p.label}</span>
                  </div>
                  <p className="text-xs text-muted">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border/10">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" />
                  생성 중...
                </span>
              ) : (
                '워크스페이스 생성'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
