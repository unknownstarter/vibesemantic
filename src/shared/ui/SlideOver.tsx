'use client'

import { useEffect, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title?: string | ReactNode
  children: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  className?: string
}

const WIDTH_CLASSES = {
  sm: 'w-full sm:w-96',
  md: 'w-full sm:w-[480px]',
  lg: 'w-full sm:w-[600px]',
  xl: 'w-full sm:w-[720px]',
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  showCloseButton = true,
  className,
}: SlideOverProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide Over Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className={cn(
            'relative w-screen',
            WIDTH_CLASSES[width],
            className
          )}
        >
          {/* Slide animation wrapper */}
          <div
            className={cn(
              'flex h-full flex-col bg-surface border-l border-border/20 shadow-2xl',
              'transform transition-transform duration-300 ease-out',
              isOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                {title && (
                  typeof title === 'string' ? (
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                  ) : (
                    <div className="text-lg font-semibold text-foreground">{title}</div>
                  )
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-inset transition-colors"
                    aria-label="닫기"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
