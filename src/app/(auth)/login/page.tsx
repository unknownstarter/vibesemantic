'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import Link from 'next/link'

// 로고 아이콘
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" className="fill-surface" />
      <g className="fill-primary">
        <rect x="4" y="8" width="20" height="2" rx="1" />
        <rect x="4" y="13" width="12" height="2" rx="1" />
        <rect x="4" y="18" width="20" height="2" rx="1" />
        <rect x="4" y="23" width="12" height="2" rx="1" />
      </g>
    </svg>
  )
}

// 스피너
function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8' }
  return (
    <div className={`${sizes[size]} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
    </div>
  )
}

// 성공 아이콘
function SuccessIcon() {
  return (
    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
      <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}

// 에러 아이콘
function ErrorIcon() {
  return (
    <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center">
      <svg className="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  )
}

// Google 아이콘
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const [validationError, setValidationError] = useState('')
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 이미 로딩 중이거나 쿨다운 중이면 무시
    if (loading || cooldown) return
    
    // 이메일 유효성 검사
    if (!email || !email.includes('@')) {
      setValidationError('올바른 이메일 주소를 입력해주세요')
      return
    }
    
    setLoading(true)
    setCooldown(true)
    setStatus('idle')
    setMessage('')
    setValidationError('')

    // 즉시 성공 화면으로 전환 (낙관적 업데이트)
    const submittedEmail = email
    setStatus('success')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: submittedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
        // PKCE를 사용하지 않도록 설정 (이메일 링크는 다른 브라우저에서 열 수 있으므로)
        flowType: 'email',
      },
    })

    setLoading(false)

    if (error) {
      setStatus('error')
      setMessage(error.message)
      // 에러 시에만 쿨다운 해제 (재시도 가능)
      setTimeout(() => setCooldown(false), 3000)
    } else {
      setMessage('이메일을 확인해주세요. 로그인 링크가 전송되었습니다.')
      // 성공 시 30초 쿨다운 (중복 전송 방지)
      setTimeout(() => setCooldown(false), 30000)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setStatus('idle')
      setMessage('')
      
      const supabase = createClient()
      
      // 프로덕션 환경에서 올바른 리다이렉트 URL 생성
      let origin = typeof window !== 'undefined' ? window.location.origin : ''
      
      // Vercel에 두 도메인이 모두 등록되어 있지만, 
      // vibesemantic.xyz는 www.vibesemantic.xyz로 리다이렉트됨
      // 실제 최종 도메인은 www.vibesemantic.xyz이므로 일관성 유지
      if (origin === 'https://vibesemantic.xyz') {
        origin = 'https://www.vibesemantic.xyz'
        console.log('[Google Login] Using www version for consistency:', origin)
      }
      
      const callbackUrl = `${origin}/callback?redirect=${encodeURIComponent(redirect)}`
      
      console.log('[Google Login] Callback URL:', callbackUrl)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      
      if (error) {
        // 상세 에러는 콘솔에만 기록
        console.error('[Google OAuth] Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        })
        setStatus('error')
        // 사용자에게는 친화적인 메시지
        setMessage('Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
      } else if (data?.url) {
        // OAuth URL로 리다이렉트
        window.location.href = data.url
      } else {
        // 예상치 못한 경우
        console.error('[Google OAuth] No URL returned:', data)
        setStatus('error')
        setMessage('Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
      }
    } catch (err) {
      // 상세 에러는 콘솔에만 기록
      console.error('[Google Login] Unexpected error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      })
      setStatus('error')
      // 사용자에게는 친화적인 메시지
      setMessage('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 배경 효과 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        {/* 로고 & 타이틀 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <LogoIcon />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Vibe Semantic</h1>
          <p className="mt-2 text-muted text-sm">데이터 분석 AI 에이전트</p>
        </div>

        <Card className="p-8">
          {status === 'success' ? (
            /* 성공 상태 */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <SuccessIcon />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                이메일을 확인해주세요
              </h2>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                <span className="text-primary font-medium">{email}</span>으로<br />
                로그인 링크를 전송했습니다.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setStatus('idle')
                  setEmail('')
                  setCooldown(false)
                }}
                className="text-sm"
                disabled={loading}
              >
                다른 이메일로 로그인
              </Button>
              
              {cooldown && !loading && (
                <p className="text-xs text-subtle mt-3">
                  이미 전송됨 · 메일이 오지 않으면 스팸함을 확인하세요
                </p>
              )}
            </div>
          ) : (
            /* 로그인 폼 */
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (validationError) setValidationError('')
                    }}
                    onInvalid={(e) => {
                      e.preventDefault()
                      setValidationError('올바른 이메일 주소를 입력해주세요')
                    }}
                    className={`w-full px-4 py-3 bg-surface/50 border rounded-lg 
                             text-foreground placeholder:text-subtle
                             focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40
                             transition-all duration-200
                             ${validationError ? 'border-danger/40 focus:border-danger/60 focus:ring-danger/20' : 'border-border/20'}`}
                    placeholder="your@email.com"
                  />
                  {validationError && (
                    <p className="mt-1.5 text-xs text-danger/80 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {validationError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || cooldown}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      전송 중...
                    </span>
                  ) : cooldown ? (
                    '전송됨 · 잠시 후 재시도'
                  ) : (
                    '매직 링크로 로그인'
                  )}
                </Button>
              </form>

              {/* 구분선 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-surface/5 text-subtle text-xs">또는</span>
                </div>
              </div>

              {/* Google 로그인 */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    연결 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <GoogleIcon />
                    Google로 로그인
                  </span>
                )}
              </Button>

              {/* 에러 메시지 */}
              {status === 'error' && message && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <ErrorIcon />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-danger font-medium">로그인 실패</p>
                    <p className="text-xs text-danger/80 mt-0.5">{message}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* 하단 링크 */}
        <p className="mt-6 text-center text-sm text-subtle">
          아직 계정이 없으신가요?{' '}
          <span className="text-muted">이메일 입력 후 매직 링크를 받으세요</span>
        </p>

        {/* 홈으로 돌아가기 */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-subtle hover:text-muted transition-colors">
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 하단 푸터 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-xs text-subtle">© 2026 Dropdown</p>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-subtle">
          <Link href="/privacy" className="hover:text-muted transition-colors">개인정보처리방침</Link>
          <span>/</span>
          <Link href="/terms" className="hover:text-muted transition-colors">서비스 이용약관</Link>
        </div>
      </div>
    </div>
  )
}

// 로딩 폴백
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 relative">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}
