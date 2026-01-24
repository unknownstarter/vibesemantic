import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { WorkspacePurpose, WorkspaceStatus, AgentConfig } from '@/types/database'

type RouteParams = { params: Promise<{ workspaceId: string }> }

// GET: Workspace 상세 정보
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  // 먼저 workspace를 조회해서 project_id 확인
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // 권한 확인
  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ 
    workspace,
    project: context.project,
    role: context.role,
  })
}

// PATCH: Workspace 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  // 먼저 workspace를 조회해서 project_id 확인
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('project_id')
    .eq('id', workspaceId)
    .single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const body = await request.json()
  const { name, purpose, status, agent_config } = body as {
    name?: string
    purpose?: WorkspacePurpose
    status?: WorkspaceStatus
    agent_config?: AgentConfig
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (purpose !== undefined) updateData.purpose = purpose
  if (status !== undefined) updateData.status = status
  if (agent_config !== undefined) updateData.agent_config = agent_config

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
  }

  const { data: updatedWorkspace, error: updateError } = await supabase
    .from('workspaces')
    .update(updateData)
    .eq('id', workspaceId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId: workspace.project_id,
    workspaceId,
    action: AuditActions.WORKSPACE_UPDATE,
    llmPayloadSummary: { updatedFields: Object.keys(updateData) },
  })

  return NextResponse.json({ workspace: updatedWorkspace })
}

// DELETE: Workspace 삭제
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('project_id')
    .eq('id', workspaceId)
    .single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
