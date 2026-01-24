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

  const authUrl = getAuthUrl(projectId)
  
  return NextResponse.json({ authUrl })
}
