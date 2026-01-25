'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import { DataSourceBadge } from './DataSourceBadge'

interface StatusCardProps {
  title: string
  description?: string
  ga4?: {
    connected: boolean
    email?: string
    propertyName?: string
  }
  csv?: {
    connected: boolean
    datasetCount?: number
    datasetName?: string
  }
  href?: string
  onClick?: () => void
  className?: string
  actionLabel?: string
}

export function StatusCard({
  title,
  description,
  ga4,
  csv,
  href,
  onClick,
  className,
  actionLabel,
}: StatusCardProps) {
  const hasConnection = ga4?.connected || csv?.connected
  const isClickable = href || onClick

  const content = (
    <div
      className={cn(
        'p-6 rounded-2xl border transition-all duration-300',
        hasConnection
          ? 'bg-surface border-border/10 hover:border-border/30'
          : 'bg-surface-inset/50 border-border/10 hover:border-border/20',
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-muted">{description}</p>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ga4 && (
          <DataSourceBadge
            type="ga4"
            connected={ga4.connected}
            size="sm"
          />
        )}
        {csv && (
          <DataSourceBadge
            type="csv"
            connected={csv.connected}
            count={csv.datasetCount}
            size="sm"
          />
        )}
      </div>

      {/* Details */}
      {hasConnection && (
        <div className="space-y-2 text-sm">
          {ga4?.connected && ga4.email && (
            <div className="flex justify-between py-1 border-b border-border/10 last:border-0">
              <span className="text-muted">계정</span>
              <span className="text-foreground truncate ml-2">{ga4.email}</span>
            </div>
          )}
          {ga4?.connected && ga4.propertyName && (
            <div className="flex justify-between py-1 border-b border-border/10 last:border-0">
              <span className="text-muted">Property</span>
              <span className="text-foreground truncate ml-2">{ga4.propertyName}</span>
            </div>
          )}
          {csv?.connected && csv.datasetCount !== undefined && (
            <div className="flex justify-between py-1">
              <span className="text-muted">데이터셋</span>
              <span className="text-foreground truncate ml-2 text-right">
                {csv.datasetName 
                  ? (csv.datasetCount > 1 ? `${csv.datasetName} 외 ${csv.datasetCount - 1}개` : csv.datasetName)
                  : `${csv.datasetCount}개`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      {actionLabel && (
        <div className="mt-4 pt-4 border-t border-border/10">
          <span className="text-sm text-primary font-medium">{actionLabel} →</span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}
