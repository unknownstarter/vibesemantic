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

/** Epic 5.2: 차트→채팅. "이 숫자에 대해 물어보기" 시 전달되는 컨텍스트 */
export interface ChartContext {
  range?: ReportRange
  metricNames?: string[]
  chartType?: string
  label?: string
}

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
  chartContext?: ChartContext
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
    throw new Error('BRAIN_API_URL and BRAIN_API_KEY must be set in environment variables')
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
    chart_context: request.chartContext ?? undefined,
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
      let errorMessage = `AI 서버 오류 (${response.status})`
      try {
        const errorText = await response.text()
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.detail || errorJson.error || errorMessage
          } catch {
            // JSON 파싱 실패 시 텍스트 그대로 사용 (너무 길면 잘라냄)
            errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText
          }
        }
      } catch {
        // 에러 텍스트 읽기 실패 시 기본 메시지 사용
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // 응답 검증
    if (!data || typeof data !== 'object') {
      throw new Error('AI 서버 응답 형식이 올바르지 않습니다.')
    }

    return {
      analysisMarkdown: data.analysis_markdown || '',
      analystQuestions: Array.isArray(data.analyst_questions) ? data.analyst_questions : [],
      martSummary: data.mart_summary,
      threadId: data.thread_id || request.threadId,
      dataAccessed: Array.isArray(data.data_accessed) ? data.data_accessed : [],
    }
  } catch (error) {
    clearTimeout(timeoutId)
    
    // 네트워크 에러나 타임아웃 에러를 명확하게 처리
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
      }
      // fetch 에러 (네트워크 문제)
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        throw new Error('AI 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }
    }
    
    throw error
  }
}
