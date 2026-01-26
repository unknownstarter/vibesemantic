'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  suggestions?: string[]
}

// Send Icon
function SendIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22,2 15,22 11,13 2,9"/>
    </svg>
  )
}

// Sparkle Icon for AI hint
function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
  )
}

export function ChatInput({ onSend, disabled, placeholder, suggestions }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Debounced auto-resize
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    
    // Simple resize without animation
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const handleSubmit = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [message, disabled, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onSend(suggestion)
  }, [onSend])

  return (
    <div className="space-y-3">
      {/* Suggestions */}
      <AnimatePresence>
        {suggestions && suggestions.length > 0 && !message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2"
          >
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={disabled}
                className="px-3 py-1.5 text-sm bg-surface border border-border/20 rounded-full
                  text-muted hover:text-foreground hover:border-primary/40 hover:bg-surface-inset
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-1.5"
              >
                <SparkleIcon className="w-3 h-3 text-primary/60" />
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div
        animate={{ 
          borderColor: isFocused ? 'rgba(var(--primary-rgb), 0.4)' : 'rgba(var(--border-rgb), 0.2)',
          boxShadow: isFocused ? '0 8px 30px rgba(var(--primary-rgb), 0.05)' : 'none'
        }}
        className="relative flex items-center gap-2 p-2 sm:p-3 rounded-2xl bg-surface border"
      >
        {/* AI Indicator */}
        <div className="shrink-0">
          <motion.div 
            animate={{ 
              backgroundColor: disabled ? 'rgba(var(--primary-rgb), 0.2)' : 'var(--surface-inset)'
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
          >
            <SparkleIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${disabled ? 'text-primary animate-pulse' : 'text-muted'}`} />
          </motion.div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || '무엇이든 물어보세요...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-subtle
            resize-none outline-none text-sm leading-relaxed max-h-[120px]
            disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          whileHover={{ scale: message.trim() && !disabled ? 1.05 : 1 }}
          whileTap={{ scale: message.trim() && !disabled ? 0.95 : 1 }}
          className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors
            ${message.trim() && !disabled
              ? 'bg-primary text-background hover:bg-primary/90'
              : 'bg-surface-inset text-muted cursor-not-allowed'
            }`}
        >
          <SendIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>
      </motion.div>

      {/* Hint */}
      <p className="text-xs text-subtle text-center">
        <kbd className="px-1.5 py-0.5 bg-surface-inset rounded text-[10px] font-mono">Enter</kbd>
        {' '}전송 · {' '}
        <kbd className="px-1.5 py-0.5 bg-surface-inset rounded text-[10px] font-mono">Shift + Enter</kbd>
        {' '}줄바꿈
      </p>
    </div>
  )
}
