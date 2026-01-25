import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Supabase signOut이 쿠키를 자동으로 삭제함
    await supabase.auth.signOut()
    
    // request.url에서 origin 추출 (프로덕션/개발 환경 모두 대응)
    const origin = request.nextUrl.origin
    
    // /login으로 명확하게 리다이렉트
    const loginUrl = new URL('/login', origin)
    
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error('[Signout] Error:', error)
    // 에러가 발생해도 로그인 페이지로 리다이렉트
    const origin = request.nextUrl.origin
    return NextResponse.redirect(new URL('/login', origin))
  }
}
