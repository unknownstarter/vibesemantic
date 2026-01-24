'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

interface QuickReplyChipProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'outline'
  icon?: React.ReactNode
}

export const QuickReplyChip = memo(function QuickReplyChip({ 
  label, 
  onClick, 
  disabled, 
  variant = 'default',
  icon 
}: QuickReplyChipProps) {
  const variants = {
    default: `
      bg-surface-inset border-border/20 text-muted
      hover:border-primary/40 hover:text-foreground hover:bg-surface
    `,
    primary: `
      bg-primary/10 border-primary/30 text-primary
      hover:bg-primary/20 hover:border-primary/50
    `,
    outline: `
      bg-transparent border-border/30 text-muted
      hover:border-foreground/30 hover:text-foreground
    `,
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-xl border
        text-sm font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
      `}
    >
      {icon && <span className="text-current opacity-70">{icon}</span>}
      {label}
    </motion.button>
  )
})

// Preset Icons for common actions
export function ChartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

export function TrendIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
      <polyline points="17,6 23,6 23,12"/>
    </svg>
  )
}

export function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

export function TargetIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}
