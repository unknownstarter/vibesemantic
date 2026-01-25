import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  // 에러가 있으면 에러 페이지로
  if (error) {
    const errorUrl = new URL('/callback/error', origin)
    errorUrl.searchParams.set('error', error)
    if (errorCode) errorUrl.searchParams.set('error_code', errorCode)
    if (errorDescription) errorUrl.searchParams.set('error_description', errorDescription)
    return NextResponse.redirect(errorUrl)
  }

  // code가 있으면 세션 교환
  if (code) {
    // Route Handler에서 쿠키를 명시적으로 처리
    let response = NextResponse.redirect(new URL(redirect, origin))

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 이메일 OTP의 경우 PKCE를 사용하지 않으므로 exchangeCodeForSession 사용
    // PKCE를 사용하는 경우에는 자동으로 code verifier를 쿠키에서 찾음
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[Callback] Session exchange error:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name,
        code: code.substring(0, 10) + '...', // 코드 일부만 로그
      })
      const errorUrl = new URL('/callback/error', origin)
      errorUrl.searchParams.set('error', 'session_error')
      errorUrl.searchParams.set('error_code', 'exchange_failed')
      errorUrl.searchParams.set('error_description', exchangeError.message)
      return NextResponse.redirect(errorUrl)
    }

    if (!sessionData.session) {
      console.error('[Callback] No session returned after exchange')
      const errorUrl = new URL('/callback/error', origin)
      errorUrl.searchParams.set('error', 'session_error')
      errorUrl.searchParams.set('error_code', 'no_session')
      errorUrl.searchParams.set('error_description', 'Session was not created after code exchange')
      return NextResponse.redirect(errorUrl)
    }

    // 성공 시 쿠키가 설정된 response로 리다이렉트
    return response
  }

  // code도 없고 error도 없으면 로그인 페이지로
  return NextResponse.redirect(new URL('/login', origin))
}
