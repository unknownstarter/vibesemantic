import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isUUID } from '@/lib/supabase/auth-helpers'

type RouteParams = { params: Promise<{ workspaceId: string }> }

/**
 * GET: Chat 스레드 목록 조회 (Epic 4.6 - "내 데이터" 스레드 목록)
 * workspace 내 thread_id별로 그룹해, 최근 메시지 시점·메시지 수 반환.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId: workspaceSlugOrId } = await params
  const supabase = await createClient()

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

  const workspaceId = workspace.id
  const { context, error } = await getAuthContext(workspace.project_id, workspaceId)
  if (error || !context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10), 50)

  const { data: messages, error: fetchError } = await supabase
    .from('chat_messages')
    .select('thread_id, created_at, role, content')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const byThread = new Map<
    string,
    { thread_id: string; last_message_at: string; message_count: number; preview?: string }
  >()
  for (const m of messages ?? []) {
    const tid = m.thread_id as string
    if (!tid) continue
    if (!byThread.has(tid)) {
      byThread.set(tid, {
        thread_id: tid,
        last_message_at: (m.created_at as string) ?? '',
        message_count: 0,
        preview: m.role === 'user' ? (m.content as string)?.slice(0, 80) : undefined,
      })
    }
    const row = byThread.get(tid)!
    row.message_count += 1
    if (!row.preview && m.role === 'user') {
      row.preview = (m.content as string)?.slice(0, 80)
    }
  }

  const threads = Array.from(byThread.values())
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
    .slice(0, limit)

  return NextResponse.json({ threads })
}
