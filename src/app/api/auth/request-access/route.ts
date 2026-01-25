import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestAccess } from '@/lib/user-access'
import { appendToSheet } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user email
    const userEmail = user.email

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Update user profile to pending
    const supabaseForUpdate = await createClient()
    const { data: existing } = await supabaseForUpdate
      .from('user_profiles')
      .select('id, access_level')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      if ((existing as { access_level?: string }).access_level !== 'pending') {
        await supabaseForUpdate
          .from('user_profiles')
          .update({ 
            access_level: 'pending',
            requested_at: new Date().toISOString(),
          })
          .eq('id', (existing as { id: string }).id)
      }
    } else {
      await supabaseForUpdate
        .from('user_profiles')
        .insert({
          user_id: user.id,
          access_level: 'pending',
        })
    }

    // Send notification to admin via Google Sheets
    let sheetsError: Error | null = null
    try {
      await appendToSheet({
        type: 'access_request',
        userEmail: userEmail,
        userId: user.id,
        requestedAt: new Date().toISOString(),
        message: `사용자 ${userEmail}이(가) 프로젝트 생성/접근 권한을 요청했습니다.`,
      })
      console.log('[Access Request] Successfully sent to Google Sheets:', { userEmail, userId: user.id })
    } catch (error) {
      sheetsError = error instanceof Error ? error : new Error(String(error))
      console.error('[Access Request] Failed to send to Google Sheets:', {
        error: sheetsError.message,
        stack: sheetsError.stack,
        userEmail,
        userId: user.id,
        webAppUrl: process.env.GOOGLE_SHEETS_WEB_APP_URL ? 'SET' : 'NOT SET',
      })
      // Continue even if Google Sheets fails (user profile is already updated)
    }

    return NextResponse.json({ 
      success: true, 
      message: '권한 요청이 접수되었습니다. 관리자 승인 후 사용 가능합니다.',
      sheetsError: sheetsError ? {
        message: sheetsError.message,
        // 사용자에게는 상세 에러를 노출하지 않음 (보안)
      } : null,
    })
  } catch (error) {
    console.error('Access request error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
