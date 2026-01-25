import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { exchangeCodeForTokens, encryptToken, getOAuth2Client } from '@/lib/ga4/oauth'
import { listGA4Properties } from '@/lib/ga4/api'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog, AuditActions } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state') // projectId
  const error = request.nextUrl.searchParams.get('error')

  const supabase = await createClient()

  // Get project slug for error redirects (before we have projectId)
  let projectSlugForError = state
  if (state) {
    const { data: projectForError } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', state)
      .single()
    projectSlugForError = projectForError?.slug || state
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/projects/${projectSlugForError}/setup/ga4/connect?error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/projects/${projectSlugForError}/setup/ga4/connect?error=missing_params`, request.url)
    )
  }

  // state contains actual project ID (UUID) from OAuth start
  const projectId = state

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get project slug for redirect URLs
  const { data: project } = await supabase
    .from('projects')
    .select('slug')
    .eq('id', projectId)
    .single()
  
  const projectSlug = project?.slug || projectId // Fallback to ID if slug not found

  try {
    // 토큰 교환
    const tokens = await exchangeCodeForTokens(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens')
    }

    // 사용자 이메일 가져오기
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const email = userInfo.data.email || 'unknown'

    // GA4 연결 정보 저장 (upsert)
    const { error: upsertError } = await supabase
      .from('ga4_connections')
      .upsert({
        project_id: projectId,
        google_user_email: email,
        access_token_enc: encryptToken(tokens.access_token),
        refresh_token_enc: encryptToken(tokens.refresh_token),
        token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
      }, { onConflict: 'project_id' })

    if (upsertError) throw upsertError

    // GA4 Property 목록 가져와서 저장
    const properties = await listGA4Properties(tokens.access_token)
    
    if (properties.length > 0) {
      // 기존 properties 삭제 후 새로 저장
      await supabase
        .from('ga4_properties')
        .delete()
        .eq('project_id', projectId)

      const propertyRows = properties.map(p => ({
        project_id: projectId,
        property_id: p.name!.replace('properties/', ''),
        property_name: p.displayName || p.name || 'Unknown',
        is_selected: false,
      }))

      await supabase.from('ga4_properties').insert(propertyRows)
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      projectId,
      action: AuditActions.GA4_CONNECT,
      dataAccessed: ['ga4_connections', 'ga4_properties'],
    })

    // Property 선택 페이지로 리다이렉트 (slug 사용)
    return NextResponse.redirect(
      new URL(`/projects/${projectSlug}/setup/ga4/property`, request.url)
    )
  } catch (err) {
    console.error('GA4 OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/projects/${projectSlug}/setup/ga4/connect?error=token_exchange_failed`, request.url)
    )
  }
}
