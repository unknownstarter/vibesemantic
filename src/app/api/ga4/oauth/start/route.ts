import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/ga4/oauth'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  // 인증 + 권한 체크
  const { context, error } = await getAuthContext(projectId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  try {
    // Use actual project ID (not slug) for OAuth state
    const authUrl = getAuthUrl(context.projectId)
    
    // 디버깅: 생성된 auth URL에서 리다이렉트 URI 추출
    const urlObj = new URL(authUrl)
    const redirectUriParam = urlObj.searchParams.get('redirect_uri')
    console.log('[GA4 OAuth Start] Generated auth URL:', {
      redirectUri: redirectUriParam,
      fullUrl: authUrl.substring(0, 100) + '...',
    })
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[GA4 OAuth Start] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
        details: 'GOOGLE_CLIENT_ID 환경 변수가 설정되지 않았습니다. Vercel 대시보드에서 환경 변수를 확인해주세요.'
      },
      { status: 500 }
    )
  }
}
