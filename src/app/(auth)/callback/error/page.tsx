'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import Link from 'next/link'

// 에러 아이콘
function ErrorIcon() {
  return (
    <div className="h-16 w-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
      <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
  )
}

// 에러 코드별 메시지
function getErrorMessage(errorCode: string | null, errorDescription: string | null): { title: string; description: string } {
  switch (errorCode) {
    case 'otp_expired':
      return {
        title: '링크가 만료되었습니다',
        description: '이메일 링크는 24시간 동안만 유효합니다. 새로운 로그인 링크를 요청해주세요.',
      }
    case 'access_denied':
      return {
        title: '접근이 거부되었습니다',
        description: errorDescription || '인증에 실패했습니다. 다시 시도해주세요.',
      }
    case 'exchange_failed':
      return {
        title: '세션 생성 실패',
        description: errorDescription || '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      }
    default:
      return {
        title: '로그인 오류',
        description: errorDescription || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
      }
  }
}

function ErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const errorInfo = getErrorMessage(errorCode, errorDescription)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 배경 효과 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="text-center py-4">
          <ErrorIcon />
          <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">
            {errorInfo.title}
          </h2>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            {errorInfo.description}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                const redirect = searchParams.get('redirect') || '/dashboard'
                router.push(`/login?redirect=${encodeURIComponent(redirect)}&session_expired=true`)
              }}
              className="w-full"
            >
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

      {/* 하단 로고 */}
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
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center py-8">
          <div className="h-12 w-12 relative">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
          </div>
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
