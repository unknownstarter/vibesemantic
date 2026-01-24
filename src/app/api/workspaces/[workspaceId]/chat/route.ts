import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/supabase/auth-helpers'

type RouteParams = { params: Promise<{ workspaceId: string }> }

// GET: Chat history 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  // Workspace에서 project_id 조회
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('project_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const threadId = request.nextUrl.searchParams.get('threadId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (threadId) {
    query = query.eq('thread_id', threadId)
  }

  const { data: messages, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}
