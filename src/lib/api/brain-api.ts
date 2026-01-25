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

  console.log('[Brain API] Calling:', {
    url: `${brainApiUrl}/api/v1/analyze`,
    mode: request.mode,
    workspaceId: request.workspaceId,
    projectId: request.projectId,
    hasUserMessage: !!request.userMessage,
    range: request.range,
  })

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

    console.log('[Brain API] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Brain API error: ${response.status} ${response.statusText}`
      let errorDetails: unknown = null
      
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.detail || errorJson.error || errorMessage
        errorDetails = errorJson
      } catch {
        // If parsing fails, use the raw text
        errorMessage = errorText || errorMessage
        errorDetails = errorText
      }
      
      console.error('[Brain API] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
        mode: request.mode,
        workspaceId: request.workspaceId,
        projectId: request.projectId,
      })
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    console.log('[Brain API] Response received:', {
      hasAnalysisMarkdown: !!data.analysis_markdown,
      analysisMarkdownLength: data.analysis_markdown?.length || 0,
      questionsCount: data.analyst_questions?.length || 0,
      hasMartSummary: !!data.mart_summary,
      threadId: data.thread_id,
    })

    // 응답 검증
    if (!data.analysis_markdown && request.mode === 'chat') {
      console.warn('[Brain API] Empty analysis_markdown in chat mode response:', {
        dataKeys: Object.keys(data),
        mode: request.mode,
      })
    }

    return {
      analysisMarkdown: data.analysis_markdown || '',
      analystQuestions: data.analyst_questions || [],
      martSummary: data.mart_summary,
      threadId: data.thread_id || request.threadId,
      dataAccessed: data.data_accessed,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    
    console.error('[Brain API] Exception caught:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
      mode: request.mode,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
    })
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
      }
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        throw new Error('AI 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }
      if (error.message.includes('network') || error.message.includes('NetworkError')) {
        throw new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
      }
    }
    
    throw error
  }
}
