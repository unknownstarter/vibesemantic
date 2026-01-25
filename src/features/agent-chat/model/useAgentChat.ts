import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReportRange, ChatMessage, Workspace, AgentConfig } from '@/types/database'
import type { AnalystQuestion, MartSummary } from '@/lib/langgraph/types'

interface UseAgentChatOptions {
  workspaceId: string
  range?: ReportRange
  enabled?: boolean
}

interface UseAgentChatResult {
  // Workspace
  workspace: Workspace | null
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

export function useAgentChat({ workspaceId, range: externalRange = '7d', enabled = true }: UseAgentChatOptions): UseAgentChatResult {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  // Report state
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [reportQuestions, setReportQuestions] = useState<AnalystQuestion[]>([])
  const [reportMartSummary, setReportMartSummary] = useState<MartSummary | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [threadId, setThreadId] = useState(`thread_${Date.now()}`)
  
  const range = externalRange

  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasGeneratedRef = useRef(false)

  // Reset report when range changes
  useEffect(() => {
    setReportMarkdown(null)
    setReportQuestions([])
    setReportMartSummary(null)
    setReportError(null)
    hasGeneratedRef.current = false
  }, [range])

  // Load workspace info and cached report in parallel
  useEffect(() => {
    if (!enabled || !workspaceId) return

    setWorkspaceLoading(true)
    setWorkspaceError(null)

    // 병렬 처리: 워크스페이스 + 리포트 캐시 동시 조회
    Promise.all([
      fetch(`/api/workspaces/${workspaceId}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`워크스페이스를 불러올 수 없습니다: ${res.statusText}`)
          }
          const data = await res.json()
          return data.workspace
        }),
      fetch(`/api/workspaces/${workspaceId}/report?range=${range}`)
        .then(async (res) => {
          if (!res.ok) return null
          const data = await res.json()
          return data.report
        })
        .catch(() => null), // 리포트 캐시 실패는 무시
    ])
      .then(([workspaceData, cachedReport]) => {
        setWorkspace(workspaceData)
        
        // 캐시된 리포트가 있으면 즉시 표시
        if (cachedReport) {
          setReportMarkdown(cachedReport.report_markdown)
          const metadata = cachedReport.metadata as { questions?: AnalystQuestion[]; martSummary?: MartSummary }
          setReportQuestions(metadata?.questions || [])
          setReportMartSummary(metadata?.martSummary || null)
        }
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : '워크스페이스를 불러오는 중 오류가 발생했습니다'
        setWorkspaceError(errorMessage)
        console.error('Failed to load workspace:', err)
      })
      .finally(() => {
        setWorkspaceLoading(false)
      })
  }, [enabled, workspaceId, range])

  // Load cached report (별도 호출용)
  const loadCachedReport = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/report?range=${range}`)
      
      if (!res.ok) {
        return false
      }

      const data = await res.json()

      if (data.report) {
        setReportMarkdown(data.report.report_markdown)
        const metadata = data.report.metadata as { questions?: AnalystQuestion[]; martSummary?: MartSummary }
        setReportQuestions(metadata?.questions || [])
        setReportMartSummary(metadata?.martSummary || null)
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to load cached report:', err)
      return false
    }
  }, [workspaceId, range])

  // 워크스페이스 로드 시 캐시된 리포트도 함께 로드 (이미 병렬 처리됨)

  // Generate report
  const generateReport = useCallback(async (forceRefresh = false) => {
    if (!workspace) return

    // If not forcing refresh, try cache first
    if (!forceRefresh) {
      setReportLoading(true)
      const hasCached = await loadCachedReport()
      if (hasCached) {
        setReportLoading(false)
        return
      }
    }

    setReportLoading(true)
    setReportError(null)

    try {
      const config = workspace.agent_config as AgentConfig | undefined
      const res = await fetch(`/api/workspaces/${workspaceId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'report',
          range,
          threadId,
          language: config?.language || 'ko',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '리포트 생성에 실패했습니다')
      }

      setReportMarkdown(data.analysisMarkdown)
      setReportQuestions(data.analystQuestions || [])
      setReportMartSummary(data.martSummary || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '리포트를 생성하는 중 오류가 발생했습니다'
      setReportError(errorMessage)
      console.error('Failed to generate report:', err)
    } finally {
      setReportLoading(false)
    }
  }, [workspace, workspaceId, threadId, range, loadCachedReport])

  // Send chat message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !workspace) return

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
    setChatLoading(true)
    setChatError(null)

    try {
      const config = workspace.agent_config as AgentConfig | undefined
      const res = await fetch(`/api/workspaces/${workspaceId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          range,
          userMessage: message,
          threadId,
          language: config?.language || 'ko',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '메시지 전송에 실패했습니다')
      }

      const assistantMsg: ChatMessage = {
        id: `temp_${Date.now()}_assistant`,
        workspace_id: workspaceId,
        thread_id: threadId,
        role: 'assistant',
        content: data.analysisMarkdown,
        created_at: new Date().toISOString(),
        metadata: { questions: data.analystQuestions },
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '메시지를 전송하는 중 오류가 발생했습니다'
      setChatError(errorMessage)
      console.error('Failed to send message:', err)
    } finally {
      setChatLoading(false)
    }
  }, [workspace, workspaceId, threadId, range])

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  return {
    workspace,
    workspaceLoading,
    workspaceError,
    reportMarkdown,
    reportQuestions,
    reportMartSummary,
    reportLoading,
    reportError,
    loadCachedReport,
    generateReport,
    messages,
    chatLoading,
    chatError,
    sendMessage,
    threadId,
    chatEndRef,
  }
}
