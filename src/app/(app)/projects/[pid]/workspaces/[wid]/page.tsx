'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import { Breadcrumb } from '@/shared/ui/Breadcrumb'
import type { Workspace, WorkspacePurpose, AgentConfig } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const PURPOSE_LABELS: Record<WorkspacePurpose, string> = {
  product: '프로덕트',
  marketing: '마케팅',
  biz: '비즈니스',
  sales: '세일즈',
}

export default function WorkspaceSetupPage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility
  const workspaceSlug = params.wid as string // Can be slug or UUID for backward compatibility

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [config, setConfig] = useState<AgentConfig>({
    focusAreas: [],
    customInstructions: '',
    language: 'ko',
  })
  const [focusInput, setFocusInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceSlug}`)
      .then(res => res.json())
      .then(data => {
        setWorkspace(data.workspace)
        if (data.workspace?.agent_config) {
          setConfig({
            focusAreas: data.workspace.agent_config.focusAreas || [],
            customInstructions: data.workspace.agent_config.customInstructions || '',
            language: data.workspace.agent_config.language || 'ko',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workspaceSlug])

  const handleAddFocus = () => {
    if (focusInput.trim() && !config.focusAreas?.includes(focusInput.trim())) {
      setConfig(prev => ({
        ...prev,
        focusAreas: [...(prev.focusAreas || []), focusInput.trim()],
      }))
      setFocusInput('')
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_config: config,
          status: 'ready',
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      // Use the workspace slug for navigation
      const workspaceSlugForNav = workspace?.slug || workspaceSlug
      router.push(`/projects/${projectSlug}/workspaces/${workspaceSlugForNav}/agent`)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-16 text-muted">
        워크스페이스를 찾을 수 없습니다
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: '워크스페이스', href: `/projects/${projectSlug}/workspaces` },
            { label: workspace?.name ?? '', href: `/projects/${projectSlug}/workspaces/${workspaceSlug}/agent` },
            { label: '설정' },
          ]}
          className="mb-2"
        />
        <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
        <p className="text-muted mt-1">
          {PURPOSE_LABELS[workspace.purpose]} 분석을 위한 AI 에이전트를 설정하세요
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            응답 언어
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setConfig(prev => ({ ...prev, language: 'ko' }))}
              className={`flex-1 py-2 px-4 rounded-xl border transition ${
                config.language === 'ko'
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border/10 hover:border-border/30 text-foreground bg-surface-inset'
              }`}
            >
              한국어
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, language: 'en' }))}
              className={`flex-1 py-2 px-4 rounded-xl border transition ${
                config.language === 'en'
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border/10 hover:border-border/30 text-foreground bg-surface-inset'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            집중 분석 영역 (선택)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocus())}
              className="flex-1 px-4 py-2 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              placeholder="예: 신규 유저 유입, 전환율 개선"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleAddFocus}>
              추가
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.focusAreas?.map((area, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2"
              >
                {area}
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    focusAreas: prev.focusAreas?.filter((_, idx) => idx !== i),
                  }))}
                  className="hover:text-primary/80 transition"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            추가 지시사항 (선택)
          </label>
          <textarea
            value={config.customInstructions}
            onChange={(e) => setConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition resize-none"
            placeholder="AI 분석가에게 특별히 요청할 사항이 있다면 입력하세요"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border/10">
          <Button variant="secondary" onClick={() => router.back()}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                저장 중...
              </span>
            ) : (
              '저장하고 분석 시작'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
