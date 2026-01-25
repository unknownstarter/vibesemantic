'use client'

import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { formatMarkdown } from '../lib/formatMarkdown'
import { ReportCharts } from './ReportCharts'
import type { MartSummary } from '@/lib/langgraph/types'
import type { Json } from '@/types/database'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  metadata?: Json | null
}

// Avatar Icons
function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-background" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  )
}

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
  )
}

// Memoized to prevent re-renders
export const MessageBubble = memo(function MessageBubble({ role, content, timestamp, metadata }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'
  
  // metadata에서 martSummary 추출
  const martSummary = metadata && typeof metadata === 'object' && 'martSummary' in metadata
    ? (metadata as { martSummary?: MartSummary }).martSummary
    : null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : undefined

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {isUser ? <UserAvatar /> : <AIAvatar />}

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`relative rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-primary to-primary/80 text-background rounded-tr-sm'
              : 'bg-surface-inset border border-border/10 text-foreground rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <>
              <div 
                className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                  prose-p:text-muted prose-p:leading-relaxed prose-p:my-2
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-li:text-muted prose-li:my-1
                  prose-code:text-accent prose-code:bg-surface prose-code:px-1 prose-code:rounded
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
              />
              {martSummary && (
                <div className="mt-4 pt-4 border-t border-border/10">
                  <ReportCharts martSummary={martSummary} />
                </div>
              )}
            </>
          )}

          {/* Copy Button (Assistant only) */}
          {!isUser && (
            <motion.button
              onClick={handleCopy}
              initial={{ opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity 
                w-7 h-7 rounded-full bg-surface border border-border/30 flex items-center justify-center
                hover:bg-surface-inset hover:border-primary/50"
              title="복사"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Timestamp */}
        {formattedTime && (
          <span className="text-xs text-subtle mt-1 px-1">{formattedTime}</span>
        )}
      </div>
    </motion.div>
  )
})
