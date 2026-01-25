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
    // 참고: listUsers는 페이지네이션을 지원하지만, 이메일로 필터링은 지원하지 않음
    // 따라서 모든 사용자를 조회하고 필터링해야 함 (비효율적이지만 현재 Supabase Admin API 제한)
    const { data: usersData, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('[Check Email] Error listing users:', error)
      // 에러가 있어도 계속 진행 (보안상 사용자 존재 여부를 노출하지 않음)
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    // 해당 이메일로 가입된 사용자 찾기 (대소문자 무시)
    const normalizedEmail = email.toLowerCase().trim()
    const user = usersData.users.find(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    if (!user) {
      return NextResponse.json({
        exists: false,
        hasOAuth: false,
      })
    }

    // OAuth identity 확인 (Google 등)
    // identities 배열에서 email이 아닌 provider 찾기
    const hasOAuth = user.identities?.some(
      (identity: { provider: string }) => identity.provider !== 'email'
    ) || false

    const oauthProviders = user.identities
      ?.filter((identity: { provider: string }) => identity.provider !== 'email')
      .map((identity: { provider: string }) => identity.provider) || []

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
