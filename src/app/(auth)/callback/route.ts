import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Session exchange error:', exchangeError)
      const errorUrl = new URL('/callback/error', origin)
      errorUrl.searchParams.set('error', 'session_error')
      errorUrl.searchParams.set('error_code', 'exchange_failed')
      errorUrl.searchParams.set('error_description', exchangeError.message)
      return NextResponse.redirect(errorUrl)
    }

    // 성공 시 리다이렉트
    return NextResponse.redirect(new URL(redirect, origin))
  }

  // code도 없고 error도 없으면 로그인 페이지로
  return NextResponse.redirect(new URL('/login', origin))
}
