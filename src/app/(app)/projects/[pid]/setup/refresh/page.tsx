'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import type { ReportRange } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// Success Icon
function SuccessIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

// Error Icon
function ErrorIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function RefreshPage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility

  const [range, setRange] = useState<ReportRange>('7d')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [projectStatus, setProjectStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(res => res.json())
      .then(data => {
        setProjectStatus(data.project?.setup_status)
      })
  }, [projectSlug])

  const handleRefresh = async () => {
    setLoading(true)
    setStatus('syncing')
    setErrorMessage('')

    try {
      const res = await fetch(`/api/projects/${projectSlug}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      })

      const text = await res.text()
      let data: { success?: boolean; error?: string; range?: string } = {}
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          setStatus('error')
          setErrorMessage(res.ok ? '응답 형식 오류가 발생했습니다.' : `서버 오류 (${res.status}). 잠시 후 다시 시도해주세요.`)
          setLoading(false)
          return
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `서버 오류 (${res.status}). 잠시 후 다시 시도해주세요.`)
      }

      setStatus('success')

      setTimeout(() => {
        if (projectStatus === 'ga4_ready') {
          router.push(`/projects/${projectSlug}`)
        } else {
          router.push(`/projects/${projectSlug}/workspaces`)
        }
      }, 2000)
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setErrorMessage(msg === 'Failed to execute \'json\' on \'Response\': Unexpected end of JSON input'
        ? '서버에서 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.'
        : msg)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <span>프로젝트 설정</span>
          <span>/</span>
          <span className="text-foreground">3. 데이터 동기화</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">GA4 데이터 동기화</h1>
        <p className="text-muted mt-1">GA4에서 데이터를 가져와 분석 준비를 완료하세요</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        {status === 'idle' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                동기화 기간
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setRange('7d')}
                  className={`flex-1 py-3 px-4 rounded-xl border transition ${
                    range === '7d'
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/10 hover:border-border/30 text-foreground bg-surface-inset'
                  }`}
                >
                  <div className="font-medium">최근 7일</div>
                  <div className="text-sm text-muted">빠른 시작</div>
                </button>
                <button
                  onClick={() => setRange('30d')}
                  className={`flex-1 py-3 px-4 rounded-xl border transition ${
                    range === '30d'
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/10 hover:border-border/30 text-foreground bg-surface-inset'
                  }`}
                >
                  <div className="font-medium">최근 30일</div>
                  <div className="text-sm text-muted">더 많은 인사이트</div>
                </button>
              </div>
            </div>

            <Button onClick={handleRefresh} disabled={loading} className="w-full">
              데이터 가져오기
            </Button>

            <p className="text-sm text-muted text-center mt-4">
              데이터 양에 따라 1~2분 정도 소요될 수 있습니다
            </p>
          </>
        )}

        {status === 'syncing' && (
          <div className="text-center py-8">
            <Spinner className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">데이터를 가져오는 중...</h3>
            <p className="text-sm text-muted">
              GA4에서 {range === '7d' ? '최근 7일' : '최근 30일'} 데이터를 수집하고 있습니다
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
              <SuccessIcon className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-medium text-foreground mb-2">동기화 완료!</h3>
            <p className="text-sm text-muted">이제 AI 분석을 시작할 수 있습니다</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-danger/20 rounded-full flex items-center justify-center">
              <ErrorIcon className="w-8 h-8 text-danger" />
            </div>
            <h3 className="font-medium text-foreground mb-2">동기화 실패</h3>
            <p className="text-sm text-danger mb-6">{errorMessage}</p>
            <Button variant="secondary" onClick={() => setStatus('idle')}>
              다시 시도
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
