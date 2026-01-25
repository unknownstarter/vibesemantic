import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isUUID } from '@/lib/supabase/auth-helpers'
import type { ReportRange } from '@/types/database'

type RouteParams = { params: Promise<{ workspaceId: string }> }

// GET: 캐시된 리포트 조회 (데이터 변경 시 무효화)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId: workspaceSlugOrId } = await params
  const supabase = await createClient()

  // Workspace에서 project_id 조회 (slug 또는 id로 조회)
  const isId = isUUID(workspaceSlugOrId)
  let workspaceQuery = supabase
    .from('workspaces')
    .select('id, project_id')
  
  if (isId) {
    workspaceQuery = workspaceQuery.eq('id', workspaceSlugOrId)
  } else {
    workspaceQuery = workspaceQuery.eq('slug', workspaceSlugOrId)
  }
  
  const { data: workspace, error: wsError } = await workspaceQuery.single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Use the actual workspace ID for subsequent operations
  const workspaceId = workspace.id

  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const range = request.nextUrl.searchParams.get('range') as ReportRange | null

  // 1. 프로젝트의 최신 데이터 업데이트 시점 조회
  // (GA4 refresh 또는 CSV ingest 완료 시 갱신됨)
  const { data: project } = await supabase
    .from('projects')
    .select('data_refreshed_at')
    .eq('id', workspace.project_id)
    .single()

  const latestDataUpdate = project?.data_refreshed_at || null

  // 2. 캐시된 리포트 조회
  let reportsQuery = supabase
    .from('reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (range) {
    reportsQuery = reportsQuery.eq('range', range)
  }

  const { data: reports, error: fetchError } = await reportsQuery

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const cachedReport = reports?.[0] || null

  // 3. 캐시 유효성 검사
  // - 리포트가 없으면 null 반환 (새로 생성 필요)
  // - 데이터가 리포트 생성 이후 업데이트되었으면 null 반환 (재생성 필요)
  if (cachedReport && latestDataUpdate && cachedReport.created_at) {
    const reportCreatedAt = new Date(cachedReport.created_at).getTime()
    const dataUpdatedAt = new Date(latestDataUpdate).getTime()
    
    if (dataUpdatedAt > reportCreatedAt) {
      // 데이터가 더 최신 → 캐시 무효화
      return NextResponse.json({ 
        report: null, 
        reason: 'data_updated',
        dataUpdatedAt: latestDataUpdate,
        reportCreatedAt: cachedReport.created_at,
      })
    }
  }

  // 4. 유효한 캐시 반환
  return NextResponse.json({ 
    report: cachedReport,
    cached: !!cachedReport,
    latestDataUpdate,
  })
}
