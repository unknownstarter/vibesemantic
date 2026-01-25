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
    // URL 디코딩 (한글 slug 처리)
    const decodedWorkspaceId = decodeURIComponent(workspaceSlugOrId)
    console.log('[Agent API] Request received:', { 
      original: workspaceSlugOrId,
      decoded: decodedWorkspaceId,
    })
    
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
      console.error('[Agent API] Workspace lookup failed:', {
        original: workspaceSlugOrId,
        decoded: decodedWorkspaceId,
        isId,
        error: wsError,
        errorCode: wsError?.code,
        errorMessage: wsError?.message,
        errorDetails: wsError?.details,
      })
      return NextResponse.json({ 
        error: 'Workspace not found',
        details: wsError?.message 
      }, { status: 404 })
    }

    console.log('[Agent API] Workspace found:', { 
      workspaceId: workspaceData.id,
      projectId: workspaceData.project_id 
    })

    // 권한 확인
    const { context, error: authError } = await getAuthContext(workspaceData.project_id, workspaceData.id)
    if (authError || !context) {
      console.error('[Agent API] Auth failed:', {
        projectId: workspaceData.project_id,
        workspaceId: workspaceData.id,
        error: authError,
      })
      return NextResponse.json({ 
        error: authError || 'Unauthorized',
        details: 'Authentication or authorization failed'
      }, { status: 401 })
    }

    if (!context.project || !context.workspace) {
      console.error('[Agent API] Context incomplete:', {
        hasProject: !!context.project,
        hasWorkspace: !!context.workspace,
      })
      return NextResponse.json({ 
        error: 'Project or workspace not found',
        details: 'Context data incomplete'
      }, { status: 404 })
    }

    const workspace = context.workspace
    const project = context.project
    const workspaceId = workspace.id
    const role = context.role

    if (!role) {
      console.error('[Agent API] No role found')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (project.setup_status !== 'ready') {
      console.warn('[Agent API] Project not ready:', { 
        setupStatus: project.setup_status 
      })
      return NextResponse.json({ 
        error: 'Project not ready',
        details: `Current status: ${project.setup_status}`
      }, { status: 400 })
    }

    // Request body 파싱
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Agent API] Body parse error:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
      }, { status: 400 })
    }

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

    console.log('[Agent API] Request params:', {
      mode,
      range,
      hasUserMessage: !!userMessage,
      threadId,
      language,
    })

    // Chat 모드에서는 userMessage 필수
    if (mode === 'chat' && !userMessage) {
      return NextResponse.json({ 
        error: 'User message required for chat mode' 
      }, { status: 400 })
    }

    // 브레인 API 호출
    console.log('[Agent API] Calling Brain API...')
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

    console.log('[Agent API] Brain API success:', {
      hasAnalysis: !!result.analysisMarkdown,
      questionsCount: result.analystQuestions?.length || 0,
      hasMartSummary: !!result.martSummary,
    })

    return NextResponse.json({
      analysisMarkdown: result.analysisMarkdown || '',
      analystQuestions: result.analystQuestions || [],
      martSummary: result.martSummary, // 차트용 데이터
      threadId: result.threadId,
      dataAccessed: result.dataAccessed || [],
    })
  } catch (error) {
    // 예상치 못한 에러 (try-catch 밖의 에러)
    console.error('[Agent API] Unexpected error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    })
    
    // 사용자 친화적 에러 메시지
    let errorMessage = '분석 중 오류가 발생했습니다'
    let statusCode = 500
    
    if (error instanceof Error) {
      // Brain API 에러 메시지 파싱
      if (error.message.includes('BRAIN_API_URL') || error.message.includes('BRAIN_API_KEY')) {
        errorMessage = 'AI 서버 연결 설정 오류입니다. 관리자에게 문의해주세요.'
      } else if (error.message.includes('401') || error.message.includes('Invalid API key')) {
        errorMessage = 'AI 서버 인증 오류입니다. 관리자에게 문의해주세요.'
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'AI 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.message.includes('AbortError')) {
        errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'AI 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
      } else {
        // 기타 에러는 원본 메시지 사용 (너무 기술적이지 않은 경우)
        errorMessage = error.message.length > 100 
          ? '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          : error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        // 개발 환경에서만 상세 정보 포함
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? {
          details: error.message,
          stack: error.stack,
        } : {}),
      },
      { status: statusCode }
    )
  }
}
