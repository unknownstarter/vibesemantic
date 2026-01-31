'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// PKCE/세션 끊김 등 복구 가능한 경우: 부드러운 아이콘
function RecoverableIcon() {
  return (
    <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
      <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </div>
  )
}

// 진짜 오류일 때 아이콘
function ErrorIcon() {
  return (
    <div className="h-16 w-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
      <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
  )
}

// 에러 코드별 메시지 (복구 가능 여부 + 친절한 문구)
function getErrorMessage(
  errorCode: string | null,
  errorDescription: string | null
): { title: string; description: string; recoverable: boolean } {
  const desc = errorDescription ?? ''
  const isPkceOrVerifier = /PKCE|code verifier|code_verifier/i.test(desc)

  switch (errorCode) {
    case 'otp_expired':
      return {
        title: '링크가 만료되었습니다',
        description: '이메일 링크는 24시간 동안만 유효합니다. 아래에서 새 로그인 링크를 요청해주세요.',
        recoverable: true,
      }
    case 'access_denied':
      return {
        title: '접근이 거부되었습니다',
        description: errorDescription || '인증에 실패했습니다. 다시 시도해주세요.',
        recoverable: false,
      }
    case 'exchange_failed':
      if (isPkceOrVerifier) {
        return {
          title: '로그인을 다시 해주세요',
          description:
            '다른 탭에서 로그인했거나, 브라우저 저장 정보가 비워졌을 수 있어요. 아래 "다시 로그인하기"를 누르면 깨끗하게 다시 시작할 수 있습니다.',
          recoverable: true,
        }
      }
      return {
        title: '세션을 만들지 못했어요',
        description: '아래 버튼으로 다시 로그인하면 대부분 해결돼요. 계속되면 홈에서 문의해주세요.',
        recoverable: true,
      }
    case 'no_session':
      return {
        title: '로그인을 다시 해주세요',
        description: '세션이 만들어지지 않았어요. 아래 "다시 로그인하기"로 한 번 더 시도해주세요.',
        recoverable: true,
      }
    default:
      return {
        title: '로그인 오류',
        description: errorDescription || '알 수 없는 오류가 발생했습니다. 다시 로그인해 보세요.',
        recoverable: true,
      }
  }
}

function ErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const errorInfo = getErrorMessage(errorCode, errorDescription)

  const handleRetryLogin = async () => {
    const redirect = searchParams.get('redirect') || '/dashboard'
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.push(`/login?redirect=${encodeURIComponent(redirect)}&session_expired=true`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="text-center py-4">
          {errorInfo.recoverable ? <RecoverableIcon /> : <ErrorIcon />}
          <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">
            {errorInfo.title}
          </h2>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            {errorInfo.description}
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetryLogin} className="w-full">
              다시 로그인하기
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="w-full text-muted"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </Card>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <Link href="/" className="text-sm text-subtle hover:text-muted transition-colors">
          Vibe Semantic
        </Link>
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
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center py-8">
          <Spinner size="lg" className="text-primary" />
        </div>
      </Card>
    </div>
  )
}

export default function CallbackErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorContent />
    </Suspense>
  )
}
