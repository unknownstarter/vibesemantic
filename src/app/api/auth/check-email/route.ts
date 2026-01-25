import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 이메일로 가입된 사용자가 있는지, 그리고 OAuth identity가 있는지 확인
 * 클라이언트 사이드에서 auth.users 테이블에 직접 접근할 수 없으므로 API로 제공
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }

    // Service Role Key를 사용하여 Admin API 접근
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Check Email] Missing Supabase credentials')
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    // Admin 클라이언트 생성 (Service Role Key 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Admin API를 사용하여 이메일로 사용자 조회
    const normalizedEmail = email.toLowerCase().trim()
    
    const { data: userData, error } = await supabase.auth.admin.getUserByEmail(normalizedEmail)

    if (error) {
      // 사용자를 찾을 수 없으면 에러가 발생할 수 있음 (정상적인 경우)
      if (error.message?.includes('not found') || error.message?.includes('User not found')) {
        return NextResponse.json({
          exists: false,
          hasOAuth: false,
        })
      }
      
      console.error('[Check Email] Error getting user by email:', error)
      // 다른 에러는 false 반환 (보안상 사용자 존재 여부를 노출하지 않음)
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    if (!userData || !userData.user) {
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    const user = userData.user

    // OAuth identity 확인 (Google 등)
    // identities 배열에서 email이 아닌 provider 찾기
    // Supabase에서 Google OAuth로 가입한 경우 identity.provider는 'google'입니다
    const hasOAuth = user.identities?.some(
      (identity: { provider: string }) => identity.provider !== 'email'
    ) || false

    const oauthProviders = user.identities
      ?.filter((identity: { provider: string }) => identity.provider !== 'email')
      .map((identity: { provider: string }) => identity.provider) || []

    // 디버깅을 위한 로그 (프로덕션에서는 제거 가능)
    console.log('[Check Email] User found:', {
      email: user.email,
      identities: user.identities?.map((i: any) => i.provider),
      hasOAuth,
      oauthProviders,
    })

    return NextResponse.json({
      exists: true,
      hasOAuth,
      providers: oauthProviders,
    })
  } catch (error) {
    console.error('[Check Email] Unexpected error:', error)
    // 에러가 있어도 계속 진행 (보안상 사용자 존재 여부를 노출하지 않음)
    return NextResponse.json({
      exists: false,
      hasOAuth: false,
    })
  }
}
