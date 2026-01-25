import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/supabase/auth-helpers'
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
  const { workspaceId: workspaceSlugOrId } = await params
  const supabase = await createClient()

  // Workspace에서 project_id 조회 (slug 또는 id로 조회)
  const { data: workspaceData, error: wsError } = await supabase
    .from('workspaces')
    .select('id, project_id')
    .or(`id.eq.${workspaceSlugOrId},slug.eq.${workspaceSlugOrId}`)
    .single()

  if (wsError || !workspaceData) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // 권한 확인
  const { context, error: authError } = await getAuthContext(workspaceData.project_id, workspaceData.id)
  if (authError || !context) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  if (!context.project || !context.workspace) {
    return NextResponse.json({ error: 'Project or workspace not found' }, { status: 404 })
  }

  const workspace = context.workspace
  const project = context.project
  const workspaceId = workspace.id
  const role = context.role

  if (!role) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (project.setup_status !== 'ready') {
    return NextResponse.json({ error: 'Project not ready' }, { status: 400 })
  }

  // Request body 파싱
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

  // Chat 모드에서는 userMessage 필수
  if (mode === 'chat' && !userMessage) {
    return NextResponse.json({ error: 'User message required for chat mode' }, { status: 400 })
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
    })

    // callBrainAnalyze는 에러 시 exception을 throw하므로 result.error는 항상 undefined
    // 성공 시 응답 반환
    return NextResponse.json({
      analysisMarkdown: result.analysisMarkdown || '',
      analystQuestions: result.analystQuestions || [],
      martSummary: result.martSummary, // 차트용 데이터
      threadId: result.threadId,
      dataAccessed: result.dataAccessed || [],
    })
  } catch (error) {
    console.error('[Agent API] Error calling Brain API:', {
      error: error instanceof Error ? error.message : String(error),
      workspaceId,
      projectId: project.id,
      mode,
      threadId,
      userMessage: userMessage?.substring(0, 50) + '...',
    })
    
    // 사용자 친화적 에러 메시지
    let errorMessage = '분석 중 오류가 발생했습니다'
    if (error instanceof Error) {
      // Brain API 에러 메시지 파싱
      if (error.message.includes('BRAIN_API_URL') || error.message.includes('BRAIN_API_KEY')) {
        errorMessage = 'AI 서버 연결 설정 오류입니다. 관리자에게 문의해주세요.'
      } else if (error.message.includes('401') || error.message.includes('Invalid API key')) {
        errorMessage = 'AI 서버 인증 오류입니다. 관리자에게 문의해주세요.'
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'AI 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
      } else {
        // 기타 에러는 원본 메시지 사용 (너무 기술적이지 않은 경우)
        errorMessage = error.message.length > 100 
          ? '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          : error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
