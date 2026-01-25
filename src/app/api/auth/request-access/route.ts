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
    try {
      await appendToSheet({
        type: 'access_request',
        userEmail: userEmail,
        userId: user.id,
        requestedAt: new Date().toISOString(),
        message: `사용자 ${userEmail}이(가) 프로젝트 생성/접근 권한을 요청했습니다.`,
      })
    } catch (sheetsError) {
      console.error('Failed to send access request notification:', sheetsError)
      // Continue even if Google Sheets fails
    }

    return NextResponse.json({ 
      success: true, 
      message: '권한 요청이 접수되었습니다. 관리자 승인 후 사용 가능합니다.' 
    })
  } catch (error) {
    console.error('Access request error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
