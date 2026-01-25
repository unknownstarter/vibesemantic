'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'

// 스피너
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      // 응답 본문이 비어있는지 확인
      const contentType = res.headers.get('content-type')
      const text = await res.text()
      
      if (!text) {
        throw new Error('Empty response from server')
      }

      // JSON 파싱 시도
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('[Project Create] Failed to parse response:', { text, status: res.status, statusText: res.statusText })
        throw new Error(`Invalid response from server: ${res.status} ${res.statusText}`)
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to create project: ${res.status} ${res.statusText}`)
      }

      if (!data.project || !data.project.id) {
        throw new Error('Invalid response: project data missing')
      }

      router.push(`/projects/${data.project.id}/setup/profile`)
    } catch (err) {
      console.error('[Project Create] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">새 프로젝트 만들기</h1>
        <p className="text-muted mt-1">GA4 데이터를 분석할 서비스/제품 프로젝트를 생성합니다</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              프로젝트 이름 *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-inset border border-border/10 rounded-lg 
                       text-foreground placeholder:text-subtle
                       focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40
                       transition-all duration-200"
              placeholder="예: 우리 서비스 분석"
            />
            <p className="text-sm text-muted mt-2">
              분석할 서비스나 제품의 이름을 입력하세요
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
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
                '프로젝트 생성'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
