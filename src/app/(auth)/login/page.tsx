'use client'

import { useState, Suspense, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
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
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [status, setStatus] = useState<'idle' | 'otp_sent' | 'success' | 'error'>('idle')
  const [otpError, setOtpError] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const [validationError, setValidationError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const sessionExpired = searchParams.get('session_expired') === 'true'
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const isVerifyingRef = useRef(false) // 중복 검증 방지

  // 세션 만료 메시지 표시
  useEffect(() => {
    if (sessionExpired) {
      setMessage('세션이 만료되었습니다. 다시 로그인해주세요.')
      setStatus('error')
    }
  }, [sessionExpired])

  // OTP 입력 핸들러
  const handleOtpChange = (index: number, value: string) => {
    // 숫자만 허용
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // 다음 입력칸으로 자동 이동
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 백스페이스로 이전 칸으로 이동
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      otpInputRefs.current[5]?.focus()
    }
  }

  // OTP 전송 (매직링크 대신)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading || cooldown) return

    if (!email || !email.includes('@')) {
      setValidationError('올바른 이메일 주소를 입력해주세요')
      return
    }

    setLoading(true)
    setCooldown(true)
    setStatus('idle')
    setMessage('')
    setValidationError('')

    const supabase = createClient()
    // emailRedirectTo를 명시적으로 제거하여 OTP 코드만 전송되도록 함
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // emailRedirectTo를 제거하면 OTP 코드가 전송됨 (매직링크 대신)
        // emailRedirectTo가 있으면 매직링크가 전송됨
      },
    })

    setLoading(false)

    if (error) {
      setStatus('error')
      // Rate limit 오류 처리
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.toLowerCase().includes('too many requests') ||
          error.message.toLowerCase().includes('email rate limit')) {
        // Supabase는 보통 1시간에 같은 이메일로 3-4번 정도만 허용
        // 더 긴 쿨다운 시간 설정 (1시간 = 3600000ms)
        setMessage('요청이 너무 많습니다. 같은 이메일로는 1시간에 최대 3-4번만 요청할 수 있습니다. 잠시 후 다시 시도해주세요.')
        // 1시간 쿨다운 (하지만 사용자가 다른 이메일로 시도할 수 있도록 5분 후 해제)
        setTimeout(() => setCooldown(false), 300000) // 5분 후 해제
      } else {
        setMessage(error.message)
        setTimeout(() => setCooldown(false), 3000)
      }
    } else {
      setStatus('otp_sent')
      setMessage('이메일로 전송된 6자리 코드를 입력해주세요.')
      // 성공 시 60초 쿨다운 (중복 전송 방지)
      setTimeout(() => setCooldown(false), 60000)
    }
  }

  // OTP 인증 (공통 함수)
  const verifyOtpCode = useCallback(async (otpCode: string) => {
    // 이미 검증 중이면 중복 요청 방지
    if (isVerifyingRef.current) {
      console.log('[OTP] Already verifying, skipping duplicate request')
      return
    }

    // 6자리 또는 8자리 모두 허용
    if (otpCode.length !== 6 && otpCode.length !== 8) {
      setOtpError('6자리 또는 8자리 코드를 모두 입력해주세요.')
      return
    }

    isVerifyingRef.current = true
    setVerifying(true)
    setOtpError('')

    try {
      const supabase = createClient()
      
      // 먼저 입력된 코드 그대로 시도 (8자리면 전체, 6자리면 6자리)
      let codeToVerify = otpCode
      console.log('[OTP] Verifying code:', codeToVerify.length === 8 ? `${codeToVerify.substring(0, 6)}**` : codeToVerify)
      
      let { data, error } = await supabase.auth.verifyOtp({
        email,
        token: codeToVerify,
        type: 'email',
      })

      // 8자리 코드로 실패했고 "invalid" 에러면, 앞 6자리만으로 재시도
      // 단, "expired" 에러는 재시도하지 않음 (이미 만료된 코드)
      if (error && otpCode.length === 8 && error.message.includes('invalid') && !error.message.includes('expired')) {
        console.log('[OTP] 8-digit code failed, retrying with first 6 digits')
        codeToVerify = otpCode.substring(0, 6)
        const retryResult = await supabase.auth.verifyOtp({
          email,
          token: codeToVerify,
          type: 'email',
        })
        data = retryResult.data
        error = retryResult.error
      }

      if (error) {
        console.error('[OTP] Verification error:', error.message)
        if (error.message.includes('expired')) {
          setOtpError('코드가 만료되었습니다. 새로운 코드를 요청해주세요.')
        } else if (error.message.includes('invalid')) {
          setOtpError('잘못된 코드입니다. 다시 확인해주세요.')
        } else {
          setOtpError(error.message)
        }
        setOtp(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
      } else if (data?.session) {
        console.log('[OTP] Verification successful')
        setStatus('success')
        router.push(redirect)
      }
    } catch (err) {
      // 예외 발생 시에도 ref 리셋
      console.error('[OTP] Unexpected error:', err)
      setOtpError('인증 중 오류가 발생했습니다. 다시 시도해주세요.')
      setOtp(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      // 항상 ref와 상태 리셋
      isVerifyingRef.current = false
      setVerifying(false)
    }
  }, [email, redirect, router])

  // OTP 인증 (수동 제출)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    await verifyOtpCode(otpCode)
  }

  // OTP가 모두 입력되면 자동 제출 (6자리 또는 8자리)
  useEffect(() => {
    const otpCode = otp.join('')
    if ((otpCode.length === 6 || otpCode.length === 8) && status === 'otp_sent' && !verifying) {
      // 약간의 지연을 두어 사용자가 추가 입력할 시간을 줌 (자동 제출 방지)
      // verifyOtpCode 내부에서 isVerifyingRef로 중복 방지하므로 여기서는 verifying만 체크
      const timeoutId = setTimeout(() => {
        // timeout 실행 시점에 다시 한 번 verifying 체크
        if (!verifying) {
          verifyOtpCode(otpCode)
        }
      }, 300) // 300ms 지연

      return () => clearTimeout(timeoutId)
    }
  }, [otp, status, verifying, verifyOtpCode])

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
            /* 로그인 성공 - 리다이렉트 중 */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <SuccessIcon />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                로그인 성공
              </h2>
              <p className="text-muted text-sm mb-4">
                잠시 후 대시보드로 이동합니다...
              </p>
              <div className="flex justify-center">
                <Spinner size="sm" />
              </div>
            </div>
          ) : status === 'otp_sent' ? (
            /* OTP 입력 화면 */
            <div className="py-2">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  인증 코드 입력
                </h2>
                <p className="text-muted text-sm">
                  <span className="text-primary font-medium">{email}</span>으로<br />
                  전송된 6자리 코드를 입력해주세요.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* OTP 입력 필드 */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-14 text-center text-xl font-semibold
                               bg-surface/50 border border-border/20 rounded-lg
                               text-foreground focus:outline-none focus:ring-2
                               focus:ring-primary/40 focus:border-primary/40
                               transition-all duration-200"
                      disabled={verifying}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={verifying || otp.join('').length < 6}
                  className="w-full"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      확인 중...
                    </span>
                  ) : (
                    '로그인'
                  )}
                </Button>
              </form>

              {/* 에러 메시지 */}
              {otpError && (
                <div className="mt-4 flex items-center justify-center gap-3 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <ErrorIcon />
                  <p className="text-sm text-danger text-center">{otpError}</p>
                </div>
              )}
              
              {/* 세션 만료 메시지 */}
              {sessionExpired && message && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <div className="h-5 w-5 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warning font-medium">{message}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!cooldown) {
                      handleSendOtp({ preventDefault: () => {} } as React.FormEvent)
                    }
                  }}
                  disabled={cooldown || loading}
                  className="text-sm"
                >
                  {cooldown ? '잠시 후 재전송 가능 (1분)' : '코드 다시 받기'}
                </Button>
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStatus('idle')
                      setEmail('')
                      setOtp(['', '', '', '', '', ''])
                      setCooldown(false)
                      setMessage('')
                      setOtpError('')
                    }}
                    className="text-sm text-subtle"
                  >
                    다른 이메일로 로그인
                  </Button>
                </div>
              </div>

              <p className="text-xs text-subtle mt-4 text-center">
                메일이 오지 않으면 스팸함을 확인하세요
              </p>
            </div>
          ) : (
            /* 이메일 입력 폼 */
            <>
              <form onSubmit={handleSendOtp} className="space-y-5">
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
                  ) : (
                    '이메일로 계속'
                  )}
                </Button>
              </form>

              {/* 세션 만료 메시지 (이메일 입력 폼) */}
              {sessionExpired && message && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <div className="h-5 w-5 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warning font-medium">{message}</p>
                  </div>
                </div>
              )}

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
          <span className="text-muted">이메일 입력 후 인증 코드를 받으세요</span>
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
