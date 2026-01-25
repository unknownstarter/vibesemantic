import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isUUID } from '@/lib/supabase/auth-helpers'
import { callBrainAnalyze } from '@/lib/api/brain-api'
import type {
  ProjectProfile,
  AgentConfig,
  WorkspacePurpose,
  ReportRange,
  MemberRole
} from '@/types/database'

type RouteParams = { params: Promise<{ workspaceId: string }> }

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { workspaceId: workspaceSlugOrId } = await params
    const decodedWorkspaceId = decodeURIComponent(workspaceSlugOrId)
    const supabase = await createClient()

    // Workspace에서 project_id 조회 (slug 또는 id로 조회)
    // decodedWorkspaceId 사용 (한글 slug 처리)
    const isId = isUUID(decodedWorkspaceId)
    let query = supabase
      .from('workspaces')
      .select('id, project_id')
    
    if (isId) {
      query = query.eq('id', decodedWorkspaceId)
    } else {
      query = query.eq('slug', decodedWorkspaceId)
    }
    
    const { data: workspaceData, error: wsError } = await query.single()

    if (wsError || !workspaceData) {
      return NextResponse.json({ 
        error: 'Workspace not found'
      }, { status: 404 })
    }

    const { context, error: authError } = await getAuthContext(workspaceData.project_id, workspaceData.id)
    if (authError || !context || !context.project || !context.workspace) {
      return NextResponse.json({ 
        error: authError || 'Unauthorized'
      }, { status: 401 })
    }

    const workspace = context.workspace
    const project = context.project
    const workspaceId = workspace.id
    const role = context.role
    if (!role || project.setup_status !== 'ready') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()

    const { 
      mode = 'report',
      range = '7d',
      userMessage,
      threadId = `thread_${Date.now()}`,
      language = 'ko',
    } = body as {
      mode?: 'report' | 'chat'
      range?: ReportRange
      userMessage?: string
      threadId?: string
      language?: 'ko' | 'en'
    }

    if (mode === 'chat' && !userMessage) {
      return NextResponse.json({ 
        error: 'User message required for chat mode' 
      }, { status: 400 })
    }

    const result = await callBrainAnalyze({
      userId: context.userId,
      projectId: project.id,
      workspaceId,
      role,
      language,
      projectProfile: (project.profile || {}) as ProjectProfile,
      workspacePurpose: workspace.purpose as WorkspacePurpose,
      agentConfig: (workspace.agent_config || {}) as AgentConfig,
      mode,
      range,
      userMessage,
      threadId,
    })

    return NextResponse.json({
      analysisMarkdown: result.analysisMarkdown || '',
      analystQuestions: result.analystQuestions || [],
      martSummary: result.martSummary, // 차트용 데이터
      threadId: result.threadId,
      dataAccessed: result.dataAccessed || [],
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
