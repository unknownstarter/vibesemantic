'use client'

import { useState, useEffect, useRef } from 'react'
import { SlideOver } from '@/shared/ui/SlideOver'
import { DataSourceBadge } from '@/shared/ui/DataSourceBadge'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { SkeletonReport } from '@/shared/ui/SkeletonReport'
import { useAgentChatReactQuery as useAgentChat } from '@/features/agent-chat/model/useAgentChatReactQuery'
import { MessageBubble, ChatInput, TypingIndicator, QuickReplyChip, ChartIcon, TrendIcon, CalendarIcon, TargetIcon } from '@/features/agent-chat/ui'
import { ReportCharts } from '@/features/agent-chat/ui/ReportCharts'
import { formatMarkdown } from '@/features/agent-chat/lib/formatMarkdown'
import type { ReportRange } from '@/types/database'

interface AgentSlideOverProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  projectId: string
  ga4Connected?: boolean
  csvConnected?: boolean
  csvDatasetCount?: number
}

type TabType = 'report' | 'chat'

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
  )
}

export function AgentSlideOver({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  ga4Connected = false,
  csvConnected = false,
  csvDatasetCount = 0,
}: AgentSlideOverProps) {
  const [tab, setTab] = useState<TabType>('report')
  const [range, setRange] = useState<ReportRange>('7d')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const {
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
    chatEndRef,
  } = useAgentChat({ workspaceId, range, enabled: isOpen })

  // range 변경 후 pending 메시지 전송
  useEffect(() => {
    if (pendingMessage && tab === 'chat') {
      // range가 업데이트된 후 메시지 전송
      const timer = setTimeout(() => {
        sendMessage(pendingMessage)
        setPendingMessage(null)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [range, tab, pendingMessage, sendMessage])

  // Auto-generate report on first open (캐시가 없을 때만)
  useEffect(() => {
    if (isOpen && tab === 'report' && !reportMarkdown && !reportLoading && workspace) {
      // useAgentChat Hook에서 이미 캐시를 로드했으므로, 없을 때만 생성
      generateReport(false)
    }
  }, [isOpen, tab, reportMarkdown, reportLoading, workspace, generateReport])

  const chatSuggestions = [
    '이번 주 가장 큰 변화는?',
    '전환율 개선 방법 제안해줘',
    '채널별 효율 비교해줘',
  ]

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-5 h-5 text-primary" />
          <span>{workspace?.name || 'AI 분석'}</span>
        </div>
      }
      width="lg"
    >
      <div className="flex flex-col h-full">
        {/* Header with Data Sources */}
        <div className="px-6 py-3 border-b border-border/10 bg-surface-inset/50">
          <div className="flex items-center gap-2 mb-2">
            {ga4Connected && (
              <DataSourceBadge type="ga4" connected={true} size="sm" />
            )}
            {csvConnected && (
              <DataSourceBadge type="csv" connected={true} count={csvDatasetCount} size="sm" />
            )}
            {!ga4Connected && !csvConnected && (
              <span className="text-xs text-muted">데이터 소스 미연결</span>
            )}
          </div>
          
          {/* Range Toggle */}
          <div className="flex bg-surface rounded-lg p-1 w-fit">
            {(['7d', '30d'] as ReportRange[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRange(r); setReportMarkdown(null) }}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-inset/50 border-b border-border/10">
          <button
            onClick={() => setTab('report')}
            className={`flex-1 py-2 px-4 text-sm rounded-lg transition-colors ${
              tab === 'report'
                ? 'bg-primary text-background font-medium'
                : 'text-muted hover:text-foreground'
            }`}
          >
            리포트
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-2 px-4 text-sm rounded-lg transition-colors ${
              tab === 'chat'
                ? 'bg-primary text-background font-medium'
                : 'text-muted hover:text-foreground'
            }`}
          >
            채팅
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {workspaceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
              <span className="ml-3 text-muted">워크스페이스 로딩 중...</span>
            </div>
          ) : workspaceError ? (
            <div className="p-6">
              <ErrorMessage message={workspaceError} />
            </div>
          ) : tab === 'report' ? (
            <div className="p-6">
              {reportError && (
                <div className="mb-4">
                  <ErrorMessage message={reportError} />
                </div>
              )}
              {reportLoading ? (
                <div>
                  <SkeletonReport />
                  <div className="flex items-center justify-center py-4 border-t border-border/10 mt-6">
                    <Spinner size="md" />
                    <span className="ml-3 text-sm text-muted">리포트 생성 중...</span>
                  </div>
                </div>
              ) : reportMarkdown ? (
                <>
                  <div 
                    className="prose prose-invert max-w-none mb-6
                      prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:text-muted prose-p:leading-relaxed prose-p:my-3
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-li:text-muted prose-li:my-1
                      prose-ul:my-3 prose-ol:my-3
                      prose-code:text-accent prose-code:bg-surface-inset prose-code:px-1.5 prose-code:rounded prose-code:border prose-code:border-border/10
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-hr:border-border/20"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(reportMarkdown) }}
                  />
                  
                  {reportMartSummary && (
                    <div className="mb-6 mt-8">
                      <ReportCharts martSummary={reportMartSummary} />
                    </div>
                  )}

                  {reportQuestions.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border/10">
                      <h3 className="text-sm font-semibold text-foreground mb-4">추가 질문</h3>
                      <div className="space-y-3">
                        {reportQuestions.map((q) => {
                          // Quick Reply 아이콘 선택 함수
                          const getIcon = (params?: { focus?: string; range?: string }) => {
                            if (!params) return null
                            if (params.focus === 'channel') return <ChartIcon />
                            if (params.focus === 'page') return <TargetIcon />
                            if (params.focus === 'trend') return <TrendIcon />
                            if (params.range) return <CalendarIcon />
                            return null
                          }

                          return (
                            <div key={q.id} className="p-4 bg-surface-inset rounded-xl border border-border/10">
                              <p className="text-sm text-foreground mb-3">{q.question}</p>
                              <div className="flex flex-wrap gap-2">
                                {q.quickReplies && Array.isArray(q.quickReplies) && q.quickReplies.length > 0 ? (
                                  q.quickReplies.map((reply, idx) => {
                                    const label = reply?.label || (typeof reply === 'string' ? reply : `옵션 ${idx + 1}`)
                                    const nextParams = reply?.nextParams || (typeof reply === 'object' && !reply.label ? reply : {})
                                    
                                    return (
                                      <QuickReplyChip
                                        key={idx}
                                        label={label}
                                        onClick={() => {
                                          // nextParams를 기반으로 더 구체적인 메시지 생성
                                          let message = q.question
                                          
                                          // focus에 따른 메시지 개선
                                          if (nextParams?.focus) {
                                            const focusMap: Record<string, string> = {
                                              channel: '채널별',
                                              page: '페이지별',
                                              trend: '트렌드',
                                              conversion: '전환율'
                                            }
                                            const focusText = focusMap[nextParams.focus]
                                            if (focusText) {
                                              message = `${focusText} 관점에서 ${message}`
                                            }
                                          }
                                          
                                          // segment 추가
                                          if (nextParams?.segment) {
                                            message = `${nextParams.segment} 기준으로 ${message}`
                                          }
                                          
                                          // range 변경이 필요한 경우
                                          if (nextParams?.range && nextParams.range !== range) {
                                            setRange(nextParams.range as ReportRange)
                                            setPendingMessage(message)
                                          } else {
                                            // range 변경이 없으면 즉시 전송
                                            setPendingMessage(message)
                                          }
                                          
                                          // 채팅 탭으로 전환
                                          setTab('chat')
                                        }}
                                        variant={idx === 0 ? 'primary' : 'outline'}
                                        icon={getIcon(nextParams)}
                                      />
                                    )
                                  })
                                ) : (
                                  <p className="text-xs text-muted">Quick Reply가 없습니다</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted">
                  리포트를 생성하려면 새로고침 버튼을 클릭하세요
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && !chatLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted mb-4">질문을 입력하여 분석을 시작하세요</p>
                    <div className="space-y-2">
                      {chatSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(suggestion)}
                          className="block w-full p-3 text-sm text-left bg-surface-inset rounded-xl border border-border/10 hover:border-border/30 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {chatError && (
                      <div className="mb-4">
                        <ErrorMessage message={chatError} />
                      </div>
                    )}
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {chatLoading && <TypingIndicator />}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t border-border/10 p-4 bg-surface-inset/50">
                <ChatInput
                  onSend={sendMessage}
                  disabled={chatLoading}
                  placeholder="질문을 입력하세요..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  )
}
