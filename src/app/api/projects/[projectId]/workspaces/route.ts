import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { WorkspacePurpose, AgentConfig, Json } from '@/types/database'

type RouteParams = { params: Promise<{ projectId: string }> }

// GET: 프로젝트의 Workspace 목록
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params
  const { context, error } = await getAuthContext(projectId)

  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  const projectId = context.projectId
  
  const { data: workspaces, error: fetchError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ workspaces })
}

// POST: 새 Workspace 생성
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

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const projectId = context.projectId

  // Project가 ready 상태이거나 CSV 데이터가 있으면 허용
  const setupStatus = context.project?.setup_status
  if (setupStatus !== 'ga4_ready' && setupStatus !== 'ready') {
    // CSV 데이터가 있는지 확인
    const supabase = await createClient()
    const { data: csvDatasets } = await supabase
      .from('csv_datasets')
      .select('id')
      .eq('project_id', projectId)
      .in('status', ['confirmed', 'ingested'])
      .limit(1)
    
    // CSV 데이터도 없으면 에러
    if (!csvDatasets || csvDatasets.length === 0) {
      return NextResponse.json({ error: 'Connect GA4 or upload CSV data first' }, { status: 400 })
    }
  }

  const body = await request.json()
  const { name, purpose, agent_config } = body as {
    name: string
    purpose?: WorkspacePurpose
    agent_config?: AgentConfig
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Workspace name required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: workspace, error: createError } = await supabase
    .from('workspaces')
    .insert({
      project_id: projectId,
      name: name.trim(),
      purpose: purpose || 'product',
      agent_config: (agent_config || {}) as Json,
      status: 'draft',
    })
    .select()
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId,
    workspaceId: workspace.id,
    action: AuditActions.WORKSPACE_CREATE,
  })

  return NextResponse.json({ workspace }, { status: 201 })
}
