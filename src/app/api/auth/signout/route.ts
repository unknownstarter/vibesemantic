import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Supabase signOut이 쿠키를 자동으로 삭제함
    await supabase.auth.signOut()
    
    // request.url에서 origin 추출 (프로덕션/개발 환경 모두 대응)
    let origin = request.nextUrl.origin
    
    // www 일관성 유지 (vibesemantic.xyz는 www로 리다이렉트)
    if (origin === 'https://vibesemantic.xyz') {
      origin = 'https://www.vibesemantic.xyz'
    }
    
    // /login으로 명확하게 리다이렉트 (GET 요청으로)
    const loginUrl = new URL('/login', origin)
    
    // 303 See Other: POST 후 GET으로 리다이렉트 (브라우저가 GET 요청으로 변경)
    return NextResponse.redirect(loginUrl, { status: 303 })
  } catch (error) {
    console.error('[Signout] Error:', error)
    // 에러가 발생해도 로그인 페이지로 리다이렉트
    let origin = request.nextUrl.origin
    if (origin === 'https://vibesemantic.xyz') {
      origin = 'https://www.vibesemantic.xyz'
    }
    return NextResponse.redirect(new URL('/login', origin), { status: 303 })
  }
}
