'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { MessageBubble, ChatInput, TypingIndicator, QuickReplyChip, ChartIcon, TrendIcon, CalendarIcon } from '@/features/agent-chat/ui'
import { ReportCharts } from '@/features/agent-chat/ui/ReportCharts'
import { formatMarkdown } from '@/features/agent-chat/lib/formatMarkdown'
import type { ReportRange, ChatMessage, Workspace, AgentConfig } from '@/types/database'
import type { AnalystQuestion, MartSummary } from '@/lib/langgraph/types'

type TabType = 'report' | 'chat'

// Icons
function ReportIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function ChatIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
  )
}

// Get icon for quick reply based on params
function getQuickReplyIcon(params: AnalystQuestion['quickReplies'][0]['nextParams']) {
  if (params.range) return <CalendarIcon />
  if (params.focus === 'channel' || params.focus === 'page') return <ChartIcon />
  if (params.focus === 'trend') return <TrendIcon />
  return null
}

export default function AgentPage() {
  const params = useParams()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility
  const workspaceSlug = params.wid as string // Can be slug or UUID for backward compatibility

  const [tab, setTab] = useState<TabType>('report')
  const [range, setRange] = useState<ReportRange>('7d')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  
  // Report state
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [reportQuestions, setReportQuestions] = useState<AnalystQuestion[]>([])
  const [reportMartSummary, setReportMartSummary] = useState<MartSummary | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [threadId, setThreadId] = useState(`thread_${Date.now()}`)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasGeneratedRef = useRef(false)

  // Load workspace info
  useEffect(() => {
    fetch(`/api/workspaces/${workspaceSlug}`)
      .then(res => res.json())
      .then(data => setWorkspace(data.workspace))
  }, [workspaceSlug])

  // Load cached report first
  const loadCachedReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/report?range=${range}`)
      const data = await res.json()

      if (data.report) {
        setReportMarkdown(data.report.report_markdown)
        // metadata에 questions 키로 저장됨
        setReportQuestions(data.report.metadata?.questions || data.report.metadata?.analystQuestions || [])
        // 캐시된 리포트에서 martSummary 복원 (있으면)
        if (data.report.metadata?.martSummary) {
          setReportMartSummary(data.report.metadata.martSummary)
        }
        return true // Cache hit
      }
      return false // Cache miss
    } catch {
      return false
    }
  }, [workspaceSlug, range])

  // Generate new report (only when cache miss or manual refresh)
  const generateReport = useCallback(async (forceRefresh = false) => {
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
    try {
      const config = workspace?.agent_config as AgentConfig | undefined
      const res = await fetch(`/api/workspaces/${workspaceSlug}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'report',
          range,
          language: config?.language || 'ko',
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setReportMarkdown(data.analysisMarkdown)
      setReportQuestions(data.analystQuestions || [])
      setReportMartSummary(data.martSummary || null)
      setThreadId(data.threadId)
    } catch (err) {
      console.error(err)
    } finally {
      setReportLoading(false)
    }
  }, [workspace?.agent_config, workspaceSlug, range, loadCachedReport])

  // Load report on mount or range change (cache first)
  useEffect(() => {
    if (tab === 'report' && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true
      generateReport(false) // Try cache first
    }
  }, [tab, generateReport])

  // Reset generated flag when range changes
  useEffect(() => {
    hasGeneratedRef.current = false
    setReportMarkdown(null)
  }, [range])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      workspace_id: workspaceSlug,
      thread_id: threadId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      metadata: null,
    }
    setMessages(prev => [...prev, userMsg])
    setChatLoading(true)

    try {
      const config = workspace?.agent_config as AgentConfig | undefined
      const res = await fetch(`/api/workspaces/${workspaceSlug}/agent`, {
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

      if (!res.ok) throw new Error(data.error)

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `temp_${Date.now()}_assistant`,
        workspace_id: workspaceSlug,
        thread_id: threadId,
        role: 'assistant',
        content: data.analysisMarkdown,
        created_at: new Date().toISOString(),
        metadata: { questions: data.analystQuestions },
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('[Agent Chat] Failed to send message:', err)
      // 에러 발생 시 사용자에게 피드백 제공
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        workspace_id: workspaceSlug,
        thread_id: threadId,
        role: 'assistant',
        content: err instanceof Error ? err.message : '메시지를 전송하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        created_at: new Date().toISOString(),
        metadata: { error: true },
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setChatLoading(false)
    }
  }, [workspace?.agent_config, workspaceSlug, threadId, range])

  const handleQuickReply = useCallback((question: AnalystQuestion, reply: AnalystQuestion['quickReplies'][0]) => {
    // Update range if specified
    if (reply.nextParams.range) {
      setRange(reply.nextParams.range)
    }
    
    // Send as chat message
    setTab('chat')
    sendMessage(`${question.question} - ${reply.label}`)
  }, [sendMessage])

  // Suggested questions for empty chat
  const chatSuggestions = [
    '이번 주 가장 큰 변화는?',
    '전환율 개선 방법 제안해줘',
    '채널별 효율 비교해줘',
  ]

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Link href={`/projects/${projectSlug}/workspaces`} className="hover:text-foreground transition">
              워크스페이스
            </Link>
            <span>/</span>
            <span className="text-foreground">{workspace?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">AI 분석</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Range Toggle */}
          <div className="flex bg-surface rounded-xl p-1 border border-border/10">
            {(['7d', '30d'] as ReportRange[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRange(r); setReportMarkdown(null) }}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  range === r 
                    ? 'bg-primary text-background font-medium' 
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {r === '7d' ? '7일' : '30일'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border/10 mb-4 w-fit">
        <button
          onClick={() => setTab('report')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'report'
              ? 'bg-surface-inset text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <ReportIcon className="w-4 h-4" />
          리포트
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'chat'
              ? 'bg-surface-inset text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <ChatIcon className="w-4 h-4" />
          채팅
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'report' ? (
          <div className="h-full overflow-y-auto">
            <AnimatePresence mode="wait">
            {reportLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-64"
              >
                <div className="text-center">
                  <Spinner size="lg" className="text-primary mx-auto" />
                  <p className="text-muted mt-4">AI가 데이터를 분석하고 있습니다...</p>
                  <p className="text-xs text-subtle mt-1">최대 30초 정도 소요될 수 있습니다</p>
                </div>
              </motion.div>
            ) : reportMarkdown ? (
              <motion.div 
                key="report"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-surface rounded-2xl border border-border/10 overflow-hidden"
              >
                {/* Report Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-surface-inset/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ReportIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">분석 리포트</h2>
                      <p className="text-xs text-muted">
                        {range === '7d' ? '최근 7일' : '최근 30일'} · {new Date().toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => generateReport(true)}>
                    <RefreshIcon className="w-4 h-4 mr-2" />
                    새로 분석
                  </Button>
                </div>

                {/* Charts Section */}
                {reportMartSummary && (
                  <div className="px-6 pt-6">
                    <ReportCharts martSummary={reportMartSummary} />
                  </div>
                )}

                {/* Markdown Content */}
                <div className="px-6 py-6">
                  <div 
                    className="prose prose-sm max-w-none text-foreground
                      prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:text-foreground/80 prose-p:leading-relaxed
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-li:text-foreground/80 prose-li:my-1
                      prose-ul:text-foreground/80 prose-ol:text-foreground/80
                      prose-code:text-primary prose-code:bg-surface-inset prose-code:px-1.5 prose-code:rounded
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-hr:border-border/20"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(reportMarkdown) }}
                  />
                </div>
                
                {/* Quick Replies */}
                {reportQuestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="px-6 py-6 border-t border-border/10 bg-surface-inset/30"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <SparkleIcon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium text-foreground">추가 분석이 필요하신가요?</h3>
                    </div>
                    <div className="space-y-4">
                      {reportQuestions.map((q, qIndex) => (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + qIndex * 0.1 }}
                          className="bg-surface rounded-xl p-4 border border-border/10"
                        >
                          <p className="text-sm text-foreground mb-3">{q.question}</p>
                          <div className="flex flex-wrap gap-2">
                            {q.quickReplies.map((reply, i) => (
                              <QuickReplyChip
                                key={i}
                                label={reply.label}
                                onClick={() => handleQuickReply(q, reply)}
                                icon={getQuickReplyIcon(reply.nextParams)}
                                variant={i === 0 ? 'primary' : 'default'}
                              />
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64 text-muted"
              >
                리포트를 불러오는 중...
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-surface rounded-2xl border border-border/10 overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center h-full text-center py-8"
                >
                  <motion.div 
                    animate={{ 
                      boxShadow: ['0 0 0 0 rgba(var(--primary-rgb), 0)', '0 0 30px 10px rgba(var(--primary-rgb), 0.1)', '0 0 0 0 rgba(var(--primary-rgb), 0)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4"
                  >
                    <SparkleIcon className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h3 className="font-semibold text-foreground mb-2">무엇이든 물어보세요</h3>
                  <p className="text-sm text-muted max-w-md">
                    데이터 기반의 인사이트와 분석을 제공합니다.
                    <br />
                    아래 제안을 선택하거나 직접 질문해보세요.
                  </p>
                </motion.div>
              )}
              </AnimatePresence>
              
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.created_at || undefined}
                />
              ))}
              
              {chatLoading && <TypingIndicator />}
              
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-border/10 p-4 bg-surface-inset/30">
              <ChatInput
                onSend={sendMessage}
                disabled={chatLoading}
                placeholder="데이터에 대해 질문해보세요..."
                suggestions={messages.length === 0 ? chatSuggestions : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
