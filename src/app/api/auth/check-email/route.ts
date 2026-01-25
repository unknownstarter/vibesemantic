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

    // Admin API를 사용하여 사용자 목록 조회 (이메일로 필터링)
    // 참고: Supabase Admin API에는 getUserByEmail이 없으므로 listUsers로 조회
    const normalizedEmail = email.toLowerCase().trim()
    let user: any = null
    
    // 첫 페이지만 조회 (일반적으로 사용자가 많지 않으므로)
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (error) {
      console.error('[Check Email] Error listing users:', error)
      // 에러가 발생하면 false 반환 (보안상 사용자 존재 여부를 노출하지 않음)
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    if (!usersData || !usersData.users) {
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    // 해당 이메일로 가입된 사용자 찾기 (대소문자 무시)
    user = usersData.users.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    )

    if (!user) {
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

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
