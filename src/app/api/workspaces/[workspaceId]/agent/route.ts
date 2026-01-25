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

      return NextResponse.json({
        analysisMarkdown: result.analysisMarkdown || '',
        analystQuestions: result.analystQuestions || [],
        martSummary: result.martSummary,
        threadId: result.threadId,
        dataAccessed: result.dataAccessed || [],
      })
    } catch (brainError) {
      // 브레인 API 에러를 명확하게 처리
      if (brainError instanceof Error) {
        // 환경 변수 누락
        if (brainError.message.includes('BRAIN_API_URL') || brainError.message.includes('BRAIN_API_KEY')) {
          return NextResponse.json({ 
            error: 'AI 서버 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' 
          }, { status: 500 })
        }
        // 네트워크 에러
        if (brainError.message.includes('fetch') || brainError.message.includes('network') || brainError.message.includes('Failed to fetch')) {
          return NextResponse.json({ 
            error: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' 
          }, { status: 503 })
        }
        // 타임아웃
        if (brainError.message.includes('timeout') || brainError.message.includes('AbortError')) {
          return NextResponse.json({ 
            error: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' 
          }, { status: 504 })
        }
        // 브레인 API 에러 메시지 전달
        return NextResponse.json({ 
          error: brainError.message || 'AI 서버에서 오류가 발생했습니다.' 
        }, { status: 500 })
      }
      throw brainError
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
