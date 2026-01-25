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

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  const projectId = context.projectId

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

  const wasProfileReady = project?.setup_status === 'profile_ready'
  if (wasProfileReady) {
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

  // Property 선택 후 데이터 새로고침 및 첫 리포트 생성 (백그라운드, 비동기)
  if (wasProfileReady) {
    // 백그라운드에서 실행 (응답을 블로킹하지 않음)
    Promise.all([
      import('@/lib/ga4/api').then(({ refreshMartData }) => refreshMartData(projectId, '7d')),
      supabase
        .from('workspaces')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'ready')
        .order('created_at', { ascending: true })
        .limit(1)
        .single(),
    ])
      .then(async ([refreshResult, workspaceResult]) => {
        if (refreshResult.success && workspaceResult.data) {
          // 데이터 새로고침 성공 + 워크스페이스 존재 시 리포트 생성
          const { generateInitialReport } = await import('@/lib/api/workspaces')
          generateInitialReport({
            projectId,
            workspaceId: workspaceResult.data.id,
            userId: context.userId,
            range: '7d',
          }).catch((err) => {
            console.error('[PropertySelect] Failed to generate initial report:', err)
          })
        }
      })
      .catch((err) => {
        // 백그라운드 작업이므로 에러는 로그만 남기고 무시
        console.error('[PropertySelect] Background task failed:', err)
      })
  }

  return NextResponse.json({ success: true })
}
