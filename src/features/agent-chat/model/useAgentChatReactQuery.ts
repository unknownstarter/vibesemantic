/**
 * React Query 기반 Agent Chat Hook
 * useAgentChat의 React Query 버전
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWorkspaceQuery, useWorkspaceReportQuery, useGenerateReportMutation, useSendChatMessageMutation } from '@/lib/react-query/queries'
import type { ReportRange, ChatMessage, AgentConfig, Json } from '@/types/database'
import type { AnalystQuestion, MartSummary } from '@/lib/langgraph/types'

interface UseAgentChatOptions {
  workspaceId: string
  range?: ReportRange
  enabled?: boolean
}

interface UseAgentChatResult {
  // Workspace
  workspace: ReturnType<typeof useWorkspaceQuery>['data'] | null
  workspaceLoading: boolean
  workspaceError: string | null

  // Report
  reportMarkdown: string | null
  reportQuestions: AnalystQuestion[]
  reportMartSummary: MartSummary | null
  reportLoading: boolean
  reportError: string | null
  loadCachedReport: () => Promise<boolean>
  generateReport: (forceRefresh?: boolean) => Promise<void>

  // Chat
  messages: ChatMessage[]
  chatLoading: boolean
  chatError: string | null
  sendMessage: (message: string) => Promise<void>
  threadId: string

  // Utils
  chatEndRef: React.RefObject<HTMLDivElement>
}

export function useAgentChatReactQuery({ workspaceId, range: externalRange = '7d', enabled = true }: UseAgentChatOptions): UseAgentChatResult {
  const range = externalRange
  const [threadId] = useState(`thread_${Date.now()}`)

  // React Query hooks
  const workspaceQuery = useWorkspaceQuery(workspaceId, enabled)
  const reportQuery = useWorkspaceReportQuery(workspaceId, range, enabled)
  const generateReportMutation = useGenerateReportMutation()
  const sendMessageMutation = useSendChatMessageMutation()

  // Report state (React Query에서 가져온 데이터를 파싱)
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [reportQuestions, setReportQuestions] = useState<AnalystQuestion[]>([])
  const [reportMartSummary, setReportMartSummary] = useState<MartSummary | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatError, setChatError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // 리포트 쿼리 데이터를 state로 동기화
  useEffect(() => {
    if (reportQuery.data) {
      setReportMarkdown(reportQuery.data.report_markdown)
      const metadata = reportQuery.data.metadata as { questions?: AnalystQuestion[]; martSummary?: MartSummary }
      setReportQuestions(metadata?.questions || [])
      setReportMartSummary(metadata?.martSummary || null)
    } else if (!reportQuery.isLoading) {
      // 리포트가 없고 로딩도 아닐 때 초기화
      setReportMarkdown(null)
      setReportQuestions([])
      setReportMartSummary(null)
    }
  }, [reportQuery.data, reportQuery.isLoading])

  // range 변경 시 리포트 초기화
  useEffect(() => {
    setReportMarkdown(null)
    setReportQuestions([])
    setReportMartSummary(null)
    setChatError(null)
  }, [range])

  // Load cached report (리포트 쿼리 refetch)
  const loadCachedReport = useCallback(async (): Promise<boolean> => {
    await reportQuery.refetch()
    return !!reportQuery.data
  }, [reportQuery])

  // Generate report
  const generateReport = useCallback(async (forceRefresh = false) => {
    if (!workspaceQuery.data) return

    // 캐시가 있고 forceRefresh가 아니면 캐시 사용
    if (!forceRefresh && reportQuery.data) {
      return
    }

    const config = workspaceQuery.data.agent_config as AgentConfig | undefined
    try {
      const result = await generateReportMutation.mutateAsync({
        workspaceId,
        range,
        threadId,
        language: config?.language || 'ko',
      })

      // martSummary가 응답에 포함되어 있으면 즉시 설정
      if (result.martSummary) {
        setReportMartSummary(result.martSummary)
      }

      // Mutation 성공 시 리포트 쿼리 refetch (캐시 업데이트)
      await reportQuery.refetch()
    } catch (err) {
      // 에러는 mutation에서 처리됨
      console.error('Failed to generate report:', err)
    }
  }, [workspaceQuery.data, workspaceId, range, threadId, generateReportMutation, reportQuery])

  // Send chat message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !workspaceQuery.data) return

    // 낙관적 업데이트: 사용자 메시지 즉시 추가
    const userMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      workspace_id: workspaceId,
      thread_id: threadId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      metadata: null,
    }
    setMessages((prev) => [...prev, userMsg])
    setChatError(null)

    try {
      const config = workspaceQuery.data.agent_config as AgentConfig | undefined
      const result = await sendMessageMutation.mutateAsync({
        workspaceId,
        range,
        userMessage: message,
        threadId,
        language: config?.language || 'ko',
      })

      // Assistant 메시지 추가
      const assistantMsg: ChatMessage = {
        id: `temp_${Date.now()}_assistant`,
        workspace_id: workspaceId,
        thread_id: threadId,
        role: 'assistant',
        content: result.analysisMarkdown,
        created_at: new Date().toISOString(),
        metadata: { 
          questions: result.analystQuestions,
          martSummary: result.martSummary 
        } as Json,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '메시지를 전송하는 중 오류가 발생했습니다'
      setChatError(errorMessage)
      // 에러 발생 시에도 사용자 메시지는 유지 (사용자가 무엇을 입력했는지 확인 가능)
      // 대신 에러 메시지를 표시하여 문제를 알림
      console.error('Failed to send message:', err)
      
      // 에러 상세 정보 로깅
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          workspaceId,
          threadId,
          range,
        })
      }
    }
  }, [workspaceQuery.data, workspaceId, threadId, range, sendMessageMutation])

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendMessageMutation.isPending])

  return {
    workspace: workspaceQuery.data || null,
    workspaceLoading: workspaceQuery.isLoading,
    workspaceError: workspaceQuery.error?.message || null,

    reportMarkdown,
    reportQuestions,
    reportMartSummary,
    reportLoading: generateReportMutation.isPending || reportQuery.isLoading,
    reportError: generateReportMutation.error?.message || reportQuery.error?.message || null,
    loadCachedReport,
    generateReport,

    messages,
    chatLoading: sendMessageMutation.isPending,
    chatError,
    sendMessage,
    threadId,

    chatEndRef,
  }
}
