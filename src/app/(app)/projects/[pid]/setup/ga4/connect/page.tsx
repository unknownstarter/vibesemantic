'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'

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

// Google Icon
function GoogleIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GA4ConnectContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility
  const error = searchParams.get('error')

  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionEmail, setConnectionEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(res => res.json())
      .then(data => {
        if (data.ga4?.connected) {
          setConnected(true)
          setConnectionEmail(data.ga4.email)
        }
      })
  }, [projectSlug])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ga4/oauth/start?projectId=${projectSlug}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to get auth URL')
      }
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get auth URL')
      }
    } catch (err) {
      console.error('[GA4 Connect] Error:', err)
      setLoading(false)
      // 에러 메시지를 URL 파라미터로 전달하여 표시
      const errorMessage = err instanceof Error ? err.message : '연결에 실패했습니다'
      router.push(`?error=${encodeURIComponent(errorMessage)}`)
    }
  }

  const handleContinue = () => {
    router.push(`/projects/${projectSlug}/setup/ga4/property`)
  }

  const getErrorMessage = (errorCode: string) => {
    // 환경 변수 관련 오류
    if (errorCode.includes('GOOGLE_CLIENT_ID') || errorCode.includes('환경 변수')) {
      return '서버 설정 오류: GOOGLE_CLIENT_ID 환경 변수가 설정되지 않았습니다. 관리자에게 문의해주세요.'
    }
    
    switch (errorCode) {
      case 'access_denied':
        return 'Google 계정 접근이 거부되었습니다.'
      case 'token_exchange_failed':
        return '토큰 교환에 실패했습니다. 다시 시도해주세요.'
      case 'missing_params':
        return '필요한 정보가 누락되었습니다.'
      default:
        return errorCode.length > 100 ? errorCode.substring(0, 100) + '...' : errorCode
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <span>프로젝트 설정</span>
          <span>/</span>
          <span className="text-foreground">2. GA4 연동</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Google Analytics 4 연동</h1>
        <p className="text-muted mt-1">GA4 계정을 연결하여 데이터 분석을 시작하세요</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <p className="font-medium text-danger">연결 실패</p>
          <p className="text-sm mt-1 text-danger/80">{getErrorMessage(error)}</p>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        {connected ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
              <SuccessIcon className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">GA4 연결됨</h3>
            <p className="text-muted mb-6">{connectionEmail}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="secondary" onClick={handleConnect} className="sm:flex-none">
                다른 계정으로 연결
              </Button>
              <Button onClick={handleContinue} className="flex-1">
                Property 선택하기
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-inset rounded-full flex items-center justify-center">
              <GoogleIcon />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">GA4 계정 연결</h3>
            <p className="text-muted mb-6">
              Google 계정으로 로그인하여 GA4 데이터에 접근할 수 있도록 권한을 부여해주세요
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    연결 중...
                  </span>
                ) : (
                  'Google 계정으로 연결'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/projects/${projectSlug}`)}
                className="w-full"
              >
                다음에 하기
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border/10">
          <h4 className="text-sm font-medium text-foreground mb-3">요청되는 권한</h4>
          <ul className="text-sm text-muted space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Google Analytics 데이터 읽기 (읽기 전용)
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              이메일 주소 확인 (연결 계정 표시용)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function GA4ConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    }>
      <GA4ConnectContent />
    </Suspense>
  )
}
