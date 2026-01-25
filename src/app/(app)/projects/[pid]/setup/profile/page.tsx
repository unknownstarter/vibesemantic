'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import type { ProjectProfile } from '@/types/database'

const INDUSTRIES = [
  'SaaS / B2B',
  'E-commerce',
  'Media / Content',
  'Fintech',
  'Healthcare',
  'Education',
  'Gaming',
  'Social / Community',
  'Other',
]

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function ProfileSetupPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.pid as string

  const [profile, setProfile] = useState<ProjectProfile>({
    serviceName: '',
    serviceDescription: '',
    targetAudience: '',
    industry: '',
    goals: [],
    kpis: [],
  })
  const [goalInput, setGoalInput] = useState('')
  const [kpiInput, setKpiInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.project?.profile) {
          setProfile({
            serviceName: data.project.profile.serviceName || '',
            serviceDescription: data.project.profile.serviceDescription || '',
            targetAudience: data.project.profile.targetAudience || '',
            industry: data.project.profile.industry || '',
            goals: data.project.profile.goals || [],
            kpis: data.project.profile.kpis || [],
          })
        }
        setInitialLoading(false)
      })
      .catch(() => setInitialLoading(false))
  }, [projectId])

  const handleAddGoal = () => {
    if (goalInput.trim() && !profile.goals?.includes(goalInput.trim())) {
      setProfile(prev => ({
        ...prev,
        goals: [...(prev.goals || []), goalInput.trim()],
      }))
      setGoalInput('')
    }
  }

  const handleAddKpi = () => {
    if (kpiInput.trim() && !profile.kpis?.includes(kpiInput.trim())) {
      setProfile(prev => ({
        ...prev,
        kpis: [...(prev.kpis || []), kpiInput.trim()],
      }))
      setKpiInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          setup_status: 'profile_ready',
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      // 데이터 소스 선택 페이지로 이동 (GA4 또는 CSV 선택 가능)
      router.push(`/projects/${projectId}/setup/sources`)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <span>프로젝트 설정</span>
          <span>/</span>
          <span className="text-foreground">1. 서비스 프로필</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">서비스 프로필 설정</h1>
        <p className="text-muted mt-1">AI 분석의 정확도를 높이기 위해 서비스 정보를 입력하세요</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              서비스/제품명 *
            </label>
            <input
              type="text"
              value={profile.serviceName}
              onChange={(e) => setProfile(prev => ({ ...prev, serviceName: e.target.value }))}
              required
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              placeholder="예: 우리 SaaS"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              서비스 설명
            </label>
            <textarea
              value={profile.serviceDescription}
              onChange={(e) => setProfile(prev => ({ ...prev, serviceDescription: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition resize-none"
              placeholder="서비스가 무엇을 하는지 간단히 설명해주세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              타겟 사용자
            </label>
            <input
              type="text"
              value={profile.targetAudience}
              onChange={(e) => setProfile(prev => ({ ...prev, targetAudience: e.target.value }))}
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              placeholder="예: 스타트업 마케터, 중소기업 대표"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              산업 분야
            </label>
            <select
              value={profile.industry}
              onChange={(e) => setProfile(prev => ({ ...prev, industry: e.target.value }))}
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
            >
              <option value="" className="bg-surface-inset text-muted">선택하세요</option>
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind} className="bg-surface-inset text-foreground">{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              비즈니스 목표
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGoal())}
                className="flex-1 px-4 py-2 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                placeholder="목표를 입력하고 Enter"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddGoal}>
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.goals?.map((goal, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-accent/20 text-accent rounded-full text-sm flex items-center gap-2"
                >
                  {goal}
                  <button
                    type="button"
                    onClick={() => setProfile(prev => ({
                      ...prev,
                      goals: prev.goals?.filter((_, idx) => idx !== i),
                    }))}
                    className="hover:text-accent/70 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              핵심 KPI
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={kpiInput}
                onChange={(e) => setKpiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKpi())}
                className="flex-1 px-4 py-2 bg-surface-inset border border-border/10 rounded-lg text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                placeholder="KPI를 입력하고 Enter"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddKpi}>
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.kpis?.map((kpi, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-success/20 text-success rounded-full text-sm flex items-center gap-2"
                >
                  {kpi}
                  <button
                    type="button"
                    onClick={() => setProfile(prev => ({
                      ...prev,
                      kpis: prev.kpis?.filter((_, idx) => idx !== i),
                    }))}
                    className="hover:text-success/70 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border/10">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || !profile.serviceName}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" />
                  저장 중...
                </span>
              ) : (
                '다음: GA4 연동'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
