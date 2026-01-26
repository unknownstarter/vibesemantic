import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { ProjectProfile } from '@/types/database'

export async function POST(request: NextRequest) {
  const body = await request.json()
  let { projectId, propertyId } = body

  if (!projectId || !propertyId) {
    return NextResponse.json({ error: 'Project ID and Property ID required' }, { status: 400 })
  }

  // Decode URL-encoded projectId (handles Korean characters in slugs)
  try {
    projectId = decodeURIComponent(projectId)
  } catch {
    // If decoding fails, use original value (might already be decoded or be a UUID)
  }

  // Debug logging
  console.log('[GA4 Property Select] Received:', { projectId, propertyId, original: body.projectId })

  const { context, error } = await getAuthContext(projectId)
  if (error || !context) {
    console.error('[GA4 Property Select] Auth failed:', { 
      projectId, 
      error, 
      hasContext: !!context,
      userId: context?.userId 
    })
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    console.error('[GA4 Property Select] Permission denied:', { 
      role: context.role,
      userId: context.userId,
      projectId: context.projectId 
    })
    return NextResponse.json({ 
      error: 'Permission denied. Only project owners can select properties.',
      role: context.role 
    }, { status: 403 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 모든 property를 is_selected=false로
  await supabase
    .from('ga4_properties')
    .update({ is_selected: false })
    .eq('project_id', context.projectId)

  // 선택한 property만 is_selected=true로
  const { error: selectError } = await supabase
    .from('ga4_properties')
    .update({ is_selected: true })
    .eq('project_id', context.projectId)
    .eq('property_id', propertyId)

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  // Project status를 ga4_ready로 업데이트 (profile_ready 상태일 때만)
  const { data: project } = await supabase
    .from('projects')
    .select('setup_status')
    .eq('id', context.projectId)
    .single()

  const wasProfileReady = project?.setup_status === 'profile_ready'
  if (wasProfileReady) {
    await supabase
      .from('projects')
      .update({ setup_status: 'ga4_ready' })
      .eq('id', context.projectId)
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId: context.projectId,
    action: AuditActions.GA4_PROPERTY_SELECT,
    dataAccessed: ['ga4_properties'],
    llmPayloadSummary: { propertyId },
  })

  // Get project profile and workspace purposes for event schema detection
  const { data: projectWithProfile } = await supabase
    .from('projects')
    .select('profile')
    .eq('id', context.projectId)
    .single()

  const projectProfile = projectWithProfile?.profile as ProjectProfile | null

  // Get workspace purposes to determine analysis context
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('purpose')
    .eq('project_id', context.projectId)
    .eq('status', 'ready')

  const workspacePurposes = workspaces?.map(w => w.purpose) || []
  // Default to 'product' if no workspaces exist
  const primaryPurpose = (workspacePurposes[0] as 'product' | 'marketing' | 'biz' | 'sales') || 'product'

  // Property 선택 후 이벤트 스키마 감지 및 데이터 새로고침 (백그라운드, 비동기)
  if (wasProfileReady) {
    // 백그라운드에서 실행 (응답을 블로킹하지 않음)
    Promise.all([
      // 1. 이벤트 스키마 감지 및 저장
      import('@/lib/ga4/schema-detection').then(async ({ detectEventSchemas, saveEventSchemas }) => {
        try {
          console.log(`[PropertySelect] Detecting event schemas for property ${propertyId} with purpose: ${primaryPurpose}`)
          const schemas = await detectEventSchemas(
            context.projectId!,
            propertyId,
            primaryPurpose,
            projectProfile || undefined
          )
          await saveEventSchemas(context.projectId!, propertyId, schemas)
          console.log(`[PropertySelect] Saved ${schemas.length} event schemas`)
        } catch (err) {
          console.error('[PropertySelect] Event schema detection failed:', err)
          // Don't block the flow if schema detection fails
        }
      }),
      // 2. 데이터 새로고침
      import('@/lib/ga4/api').then(({ refreshMartData }) => refreshMartData(context.projectId!, '7d')),
      // 3. 워크스페이스 조회
      supabase
        .from('workspaces')
        .select('id')
        .eq('project_id', context.projectId)
        .eq('status', 'ready')
        .order('created_at', { ascending: true })
        .limit(1)
        .single(),
    ])
      .then(async ([, refreshResult, workspaceResult]) => {
        if (refreshResult.success && workspaceResult.data) {
          // 데이터 새로고침 성공 + 워크스페이스 존재 시 리포트 생성
          const { generateInitialReport } = await import('@/lib/api/workspaces')
          generateInitialReport({
            projectId: context.projectId!,
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
