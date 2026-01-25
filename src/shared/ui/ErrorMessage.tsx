'use client'

import { cn } from '@/shared/lib/utils'
import { Button } from './Button'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  return (
    <div className={cn('rounded-2xl border border-danger/30 bg-danger/10 p-6', className)}>
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 text-danger shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-danger mb-1">오류가 발생했습니다</h3>
          <p className="text-sm text-muted break-words">{message}</p>
          {onRetry && (
            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={onRetry}>
                다시 시도
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
