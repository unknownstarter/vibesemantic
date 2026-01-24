import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId, propertyId } = body

  if (!projectId || !propertyId) {
    return NextResponse.json({ error: 'Project ID and Property ID required' }, { status: 400 })
  }

  const { context, error } = await getAuthContext(projectId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const supabase = await createClient()

  // 모든 property를 is_selected=false로
  await supabase
    .from('ga4_properties')
    .update({ is_selected: false })
    .eq('project_id', projectId)

  // 선택한 property만 is_selected=true로
  const { error: selectError } = await supabase
    .from('ga4_properties')
    .update({ is_selected: true })
    .eq('project_id', projectId)
    .eq('property_id', propertyId)

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  // Project status를 ga4_ready로 업데이트 (profile_ready 상태일 때만)
  const { data: project } = await supabase
    .from('projects')
    .select('setup_status')
    .eq('id', projectId)
    .single()

  if (project?.setup_status === 'profile_ready') {
    await supabase
      .from('projects')
      .update({ setup_status: 'ga4_ready' })
      .eq('id', projectId)
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId,
    action: AuditActions.GA4_PROPERTY_SELECT,
    dataAccessed: ['ga4_properties'],
    llmPayloadSummary: { propertyId },
  })

  return NextResponse.json({ success: true })
}
