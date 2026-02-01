'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const REPORT_MESSAGES = [
  '데이터를 분석하고 있어요...',
  '인사이트를 찾고 있어요...',
  '리포트를 정리하고 있어요...',
  '차트를 준비하고 있어요...',
  '거의 다 됐어요...',
]

const CHAT_MESSAGES = [
  '생각하고 있어요...',
  '답변을 준비하고 있어요...',
  '데이터를 확인하고 있어요...',
  '인사이트를 정리하고 있어요...',
  '곧 답변할게요...',
]

const ROTATE_INTERVAL_MS = 2800

interface AgentThinkingMessagesProps {
  variant: 'report' | 'chat'
  className?: string
  /** 로딩 문구 아래 보조 텍스트 (예: "최대 30초 정도 소요될 수 있습니다") */
  subText?: string
}

export function AgentThinkingMessages({
  variant,
  className = '',
  subText,
}: AgentThinkingMessagesProps) {
  const messages = variant === 'report' ? REPORT_MESSAGES : CHAT_MESSAGES
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [messages.length])

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="flex items-center gap-2 min-h-[2rem]">
        {/* Bouncing dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.12,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-muted text-sm"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      {subText && (
        <p className="text-xs text-subtle mt-2">{subText}</p>
      )}
    </div>
  )
}
