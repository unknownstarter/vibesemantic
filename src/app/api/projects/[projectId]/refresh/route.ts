import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { refreshMartData } from '@/lib/ga4/api'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { ReportRange } from '@/types/database'

type RouteParams = { params: Promise<{ projectId: string }> }

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params
  const { context, error } = await getAuthContext(projectId)

  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  // Project가 최소 ga4_ready 상태여야 함
  if (context.project?.setup_status !== 'ga4_ready' && context.project?.setup_status !== 'ready') {
    return NextResponse.json({ error: 'GA4 setup not complete' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const range = (body.range || '7d') as ReportRange

  if (range !== '7d' && range !== '30d') {
    return NextResponse.json({ error: 'Invalid range. Use 7d or 30d' }, { status: 400 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const result = await refreshMartData(context.projectId, range)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId: context.projectId,
    action: AuditActions.GA4_REFRESH,
    dataAccessed: ['mart_ga4_daily_kpis', 'mart_ga4_channel_daily', 'mart_ga4_top_pages_daily'],
    llmPayloadSummary: { range },
  })

  // 데이터 새로고침 완료 시 첫 워크스페이스에 대해 자동 리포트 생성 (백그라운드)
  const supabase = await createClient()
  const { data: firstWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('project_id', context.projectId)
    .eq('status', 'ready')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (firstWorkspace) {
    // 백그라운드에서 리포트 생성 (비동기, 에러 무시)
    import('@/lib/api/workspaces').then(({ generateInitialReport }) => {
      generateInitialReport({
        projectId: context.projectId,
        workspaceId: firstWorkspace.id,
        userId: context.userId,
        range,
      }).catch((err) => {
        console.error('[Refresh] Failed to generate initial report:', err)
      })
    }).catch(() => {
      // Import 실패는 무시
    })
  }

  return NextResponse.json({ success: true, range })
}
