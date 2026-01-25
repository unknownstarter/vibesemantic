import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirect } = body as { email: string; redirect?: string }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // 서버 사이드에서 Supabase 클라이언트 생성
    // 쿠키를 사용하여 PKCE code verifier를 쿠키에 저장
    const origin = request.nextUrl.origin
    let response = NextResponse.json({ success: true })

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // PKCE code verifier를 쿠키에 저장
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 이메일 OTP 전송
    // 서버 사이드에서 처리하면 PKCE code verifier가 쿠키에 저장되어
    // 다른 브라우저에서 이메일 링크를 열어도 작동함
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/callback?redirect=${encodeURIComponent(redirect || '/dashboard')}`,
      },
    })

    if (error) {
      console.error('[Send OTP] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 쿠키가 설정된 response 반환
    return response
  } catch (error) {
    console.error('[Send OTP] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
