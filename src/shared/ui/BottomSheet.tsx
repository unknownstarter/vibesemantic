'use client'

import { useEffect, ReactNode, useState } from 'react'
import { cn } from '@/shared/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  showDragHandle?: boolean
  maxHeight?: string
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showDragHandle = true,
  maxHeight = 'max-h-[90vh]',
  className,
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

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

  // Drag to close
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    setCurrentY(e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setCurrentY(e.clientY)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    const deltaY = currentY - startY
    // If dragged down more than 100px, close
    if (deltaY > 100) {
      onClose()
    }
    
    setIsDragging(false)
    setStartY(0)
    setCurrentY(0)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, currentY, startY])

  if (!isOpen) return null

  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          transform: `translateY(${dragOffset}px)`,
        }}
      >
        <div
          className={cn(
            'bg-surface border-t border-border/20 rounded-t-2xl shadow-2xl',
            maxHeight,
            'flex flex-col',
            className
          )}
        >
          {/* Drag Handle */}
          {showDragHandle && (
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <div className="w-12 h-1.5 bg-border/30 rounded-full" />
            </div>
          )}

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-inset transition-colors"
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
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
