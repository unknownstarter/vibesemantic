/**
 * Python FastAPI Brain API Client
 * LangGraph 엔진 호출을 위한 유틸리티
 */

import type {
  ProjectProfile,
  AgentConfig,
  WorkspacePurpose,
  ReportRange,
  MemberRole,
} from '@/types/database'
import type { AnalystQuestion, MartSummary } from '@/lib/langgraph/types'

interface AnalyzeRequest {
  userId: string
  projectId: string
  workspaceId: string
  role: MemberRole
  language: 'ko' | 'en'
  projectProfile: ProjectProfile
  workspacePurpose: WorkspacePurpose
  agentConfig: AgentConfig
  mode: 'report' | 'chat'
  range: ReportRange
  userMessage?: string
  threadId: string
}

interface AnalyzeResponse {
  analysisMarkdown: string
  analystQuestions: AnalystQuestion[]
  martSummary?: MartSummary
  threadId: string
  dataAccessed?: string[]
  error?: string
}

/**
 * Python FastAPI Brain 서버로 분석 요청
 */
export async function callBrainAnalyze(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const brainApiUrl = process.env.BRAIN_API_URL
  const brainApiKey = process.env.BRAIN_API_KEY

  if (!brainApiUrl || !brainApiKey) {
    throw new Error(
      'BRAIN_API_URL and BRAIN_API_KEY must be set in environment variables'
    )
  }

  // 타임아웃 설정 (5분)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  const requestPayload = {
    user_id: request.userId,
    project_id: request.projectId,
    workspace_id: request.workspaceId,
    role: request.role,
    language: request.language,
    project_profile: request.projectProfile,
    workspace_purpose: request.workspacePurpose,
    agent_config: request.agentConfig,
    mode: request.mode,
    range: request.range,
    user_message: request.userMessage,
    thread_id: request.threadId,
  }

  try {
    const response = await fetch(`${brainApiUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': brainApiKey,
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Brain API error: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.detail || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    return {
      analysisMarkdown: data.analysis_markdown || '',
      analystQuestions: data.analyst_questions || [],
      martSummary: data.mart_summary,
      threadId: data.thread_id || request.threadId,
      dataAccessed: data.data_accessed,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
