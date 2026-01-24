import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAnalysis } from '@/lib/langgraph/graph'
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
  const { workspaceId } = await params
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Workspace + Project 정보 조회
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select(`
      *,
      projects (
        id,
        name,
        profile,
        setup_status,
        project_members!inner (
          role,
          status
        )
      )
    `)
    .eq('id', workspaceId)
    .eq('projects.project_members.user_id', user.id)
    .eq('projects.project_members.status', 'active')
    .single()

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 404 })
  }

  const project = workspace.projects as unknown as {
    id: string
    name: string
    profile: ProjectProfile
    setup_status: string
    project_members: Array<{ role: MemberRole; status: string }>
  }

  if (project.setup_status !== 'ready') {
    return NextResponse.json({ error: 'Project not ready' }, { status: 400 })
  }

  const role = project.project_members[0]?.role
  if (!role) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
    const result = await runAnalysis({
      userId: user.id,
      projectId: project.id,
      workspaceId,
      role,
      language,
      projectProfile: project.profile || {},
      workspacePurpose: workspace.purpose as WorkspacePurpose,
      agentConfig: (workspace.agent_config || {}) as AgentConfig,
      mode,
      range,
      userMessage,
      threadId,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      analysisMarkdown: result.analysisMarkdown,
      analystQuestions: result.analystQuestions,
      martSummary: result.martSummary, // 차트용 데이터
      threadId,
      dataAccessed: result.dataAccessed,
    })
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
