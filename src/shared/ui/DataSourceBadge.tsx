'use client'

import { cn } from '@/shared/lib/utils'

interface DataSourceBadgeProps {
  type: 'ga4' | 'csv'
  connected: boolean
  count?: number // For CSV: number of datasets
  size?: 'sm' | 'md'
  className?: string
}

const TYPE_CONFIG: Record<'ga4' | 'csv', {
  label: string
  icon: string
  color: (connected: boolean) => string
}> = {
  ga4: {
    label: 'GA4',
    icon: '📊',
    color: (connected: boolean) => connected 
      ? 'bg-info/20 text-info border-info/30' 
      : 'bg-subtle/30 text-muted border-border/10',
  },
  csv: {
    label: 'CSV',
    icon: '📄',
    color: (connected: boolean) => connected 
      ? 'bg-success/20 text-success border-success/30' 
      : 'bg-subtle/30 text-muted border-border/10',
  },
}

export function DataSourceBadge({
  type,
  connected,
  count,
  size = 'sm',
  className,
}: DataSourceBadgeProps) {
  const config = TYPE_CONFIG[type]
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.color(connected),
        sizeClasses[size],
        className
      )}
      title={connected 
        ? `${config.label} 연결됨${count !== undefined ? ` (${count}개)` : ''}` 
        : `${config.label} 미연결`}
    >
      <span className="text-base leading-none">{config.icon}</span>
      <span>{config.label}</span>
      {connected && count !== undefined && count > 0 && (
        <span className="ml-0.5">({count})</span>
      )}
      {connected && (
        <svg
          className="h-3 w-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  )
}
