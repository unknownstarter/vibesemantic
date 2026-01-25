import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isUUID } from '@/lib/supabase/auth-helpers'

type RouteParams = { params: Promise<{ workspaceId: string }> }

// GET: Chat history 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId: workspaceSlugOrId } = await params
  const supabase = await createClient()

  // Workspace에서 project_id 조회 (slug 또는 id로 조회)
  const isId = isUUID(workspaceSlugOrId)
  let query = supabase
    .from('workspaces')
    .select('id, project_id')
  
  if (isId) {
    query = query.eq('id', workspaceSlugOrId)
  } else {
    query = query.eq('slug', workspaceSlugOrId)
  }
  
  const { data: workspace, error: wsError } = await query.single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Use the actual workspace ID for subsequent operations
  const workspaceId = workspace.id

  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const threadId = request.nextUrl.searchParams.get('threadId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  let messagesQuery = supabase
    .from('chat_messages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (threadId) {
    messagesQuery = messagesQuery.eq('thread_id', threadId)
  }

  const { data: messages, error: fetchError } = await messagesQuery

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}
