import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit, resolveWorkspace, isUUID } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { WorkspacePurpose, WorkspaceStatus, AgentConfig } from '@/types/database'

type RouteParams = { params: Promise<{ workspaceId: string }> }

// GET: Workspace 상세 정보
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId: workspaceSlugOrId } = await params

  // First, we need to resolve workspace to get project_id for auth check
  // Since getAuthContext requires projectId for workspace resolution, we need a two-step approach
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to find workspace by slug or ID (without project_id filter first)
  // Use isUUID to determine which field to query
  const isId = isUUID(workspaceSlugOrId)
  let query = supabase
    .from('workspaces')
    .select('id, project_id, name, purpose, status, agent_config, created_at, updated_at, slug')
  
  if (isId) {
    query = query.eq('id', workspaceSlugOrId)
  } else {
    query = query.eq('slug', workspaceSlugOrId)
  }
  
  const { data: workspace, error: wsError } = await query.single()

  if (wsError || !workspace) {
    console.error('Workspace lookup error:', wsError)
    return NextResponse.json({ 
      error: 'Workspace not found',
      details: wsError?.message || 'No workspace found with the provided identifier'
    }, { status: 404 })
  }

  // 권한 확인 (이제 project_id를 알았으므로 getAuthContext 사용)
  const { context, error } = await getAuthContext(workspace.project_id, workspace.id)
  if (error || !context) {
    console.error('Auth context error:', error)
    return NextResponse.json({ 
      error: error || 'Unauthorized',
      details: 'You do not have access to this workspace'
    }, { status: 401 })
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
  const { workspaceId: workspaceSlugOrId } = await params

  const supabase = await createClient()
  
  // Resolve workspace by slug or ID
  const isId = isUUID(workspaceSlugOrId)
  let query = supabase
    .from('workspaces')
    .select('id, project_id')
  
  if (isId) {
    query = query.eq('id', workspaceSlugOrId)
  } else {
    query = query.eq('slug', workspaceSlugOrId)
  }
  
  const { data: existingWorkspace, error: wsError } = await query.single()

  if (wsError || !existingWorkspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const workspaceId = existingWorkspace.id
  const { context, error } = await getAuthContext(existingWorkspace.project_id, workspaceId)
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
    projectId: existingWorkspace.project_id,
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
  const { workspaceId: workspaceSlugOrId } = await params

  const supabase = await createClient()
  
  // Resolve workspace by slug or ID
  const isId = isUUID(workspaceSlugOrId)
  let query = supabase
    .from('workspaces')
    .select('id, project_id')
  
  if (isId) {
    query = query.eq('id', workspaceSlugOrId)
  } else {
    query = query.eq('slug', workspaceSlugOrId)
  }
  
  const { data: existingWorkspace, error: wsError } = await query.single()

  if (wsError || !existingWorkspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const workspaceId = existingWorkspace.id
  const { context, error } = await getAuthContext(existingWorkspace.project_id, workspaceId)
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
