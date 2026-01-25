/**
 * Workspace API Client
 * 백그라운드 리포트 생성 등에 사용
 */

import { callBrainAnalyze } from '@/lib/api/brain-api'
import { createClient } from '@/lib/supabase/server'
import type { 
  ProjectProfile, 
  AgentConfig, 
  WorkspacePurpose,
  ReportRange,
  MemberRole 
} from '@/types/database'

interface GenerateInitialReportOptions {
  projectId: string
  workspaceId: string
  userId: string
  range?: ReportRange
}

/**
 * 백그라운드에서 초기 리포트 생성
 * 연동 완료 시 자동으로 호출
 */
export async function generateInitialReport({
  projectId,
  workspaceId,
  userId,
  range = '7d',
}: GenerateInitialReportOptions): Promise<void> {
  const supabase = await createClient()

  try {
    // Workspace 정보 조회
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
      .eq('projects.project_members.user_id', userId)
      .eq('projects.project_members.status', 'active')
      .single()

    if (wsError || !workspace) {
      console.error('[generateInitialReport] Workspace not found:', wsError)
      return
    }

    const project = workspace.projects as unknown as {
      id: string
      name: string
      profile: ProjectProfile
      setup_status: string
      project_members: Array<{ role: MemberRole; status: string }>
    }

    if (project.setup_status !== 'ready') {
      console.log('[generateInitialReport] Project not ready, skipping')
      return
    }

    const role = project.project_members[0]?.role
    if (!role) {
      console.error('[generateInitialReport] Access denied')
      return
    }

    // 리포트 생성 (비동기, 에러는 무시)
    await callBrainAnalyze({
      userId,
      projectId: project.id,
      workspaceId,
      role,
      language: (workspace.agent_config as AgentConfig)?.language || 'ko',
      projectProfile: project.profile || {},
      workspacePurpose: workspace.purpose as WorkspacePurpose,
      agentConfig: (workspace.agent_config || {}) as AgentConfig,
      mode: 'report',
      range,
      threadId: `initial_${Date.now()}`,
    })

    console.log('[generateInitialReport] Initial report generated successfully')
  } catch (error) {
    // 백그라운드 작업이므로 에러는 로그만 남기고 무시
    console.error('[generateInitialReport] Failed to generate initial report:', error)
  }
}
