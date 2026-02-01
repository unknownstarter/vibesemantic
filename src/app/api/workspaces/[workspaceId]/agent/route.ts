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

/** 유저에게 노출할 통일 메시지 (운영자/기술 에러는 서버 로그만) */
const USER_FACING_ERROR = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { 
      mode = 'report',
      range = '7d',
      userMessage,
      threadId = `thread_${Date.now()}`,
      language = 'ko',
      chartContext,
    } = body as {
      mode?: 'report' | 'chat'
      range?: ReportRange
      userMessage?: string
      threadId?: string
      language?: 'ko' | 'en'
      /** Epic 5.2: 차트→채팅. 선택한 차트/메트릭 컨텍스트 (range, metricNames, chartType, label) */
      chartContext?: { range?: ReportRange; metricNames?: string[]; chartType?: string; label?: string }
    }

    if (mode === 'chat' && !userMessage) {
      return NextResponse.json({ 
        error: 'User message required for chat mode' 
      }, { status: 400 })
    }

    try {
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
        chartContext,
      })

      return NextResponse.json({
        analysisMarkdown: result.analysisMarkdown || '',
        analystQuestions: result.analystQuestions || [],
        martSummary: result.martSummary,
        threadId: result.threadId,
        dataAccessed: result.dataAccessed || [],
      })
    } catch (brainError) {
      console.error('[Agent] Brain API error:', brainError instanceof Error ? brainError.message : brainError)
      return NextResponse.json({ error: USER_FACING_ERROR }, { status: 500 })
    }
  } catch (error) {
    console.error('[Agent] Unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: USER_FACING_ERROR }, { status: 500 })
  }
}
