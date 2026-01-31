'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import { DataSourceBadge } from '@/shared/ui/DataSourceBadge'
import type { Workspace, WorkspacePurpose, WorkspaceStatus } from '@/types/database'

interface WorkspaceCardProps {
  workspace: Workspace
  projectSlug: string
  ga4Connected?: boolean
  csvConnected?: boolean
  csvDatasetCount?: number
  onClick?: () => void
  className?: string
}

const PURPOSE_LABELS: Record<WorkspacePurpose, { label: string; color: string; icon: string }> = {
  product: { label: '프로덕트', color: 'bg-primary/20 text-primary', icon: '📦' },
  marketing: { label: '마케팅', color: 'bg-primary/20 text-primary', icon: '📢' },
  biz: { label: '비즈니스', color: 'bg-success/20 text-success', icon: '📊' },
  sales: { label: '세일즈', color: 'bg-warning/20 text-warning', icon: '💼' },
}

const STATUS_LABELS: Record<WorkspaceStatus, { label: string; color: string }> = {
  draft: { label: '설정 필요', color: 'text-warning' },
  ready: { label: '분석 가능', color: 'text-success' },
  error: { label: '오류', color: 'text-danger' },
}

export function WorkspaceCard({
  workspace,
  projectSlug,
  ga4Connected = false,
  csvConnected = false,
  csvDatasetCount = 0,
  onClick,
  className,
}: WorkspaceCardProps) {
  const [isHovering, setIsHovering] = useState(false)
  const purpose = PURPOSE_LABELS[workspace.purpose]
  const status = STATUS_LABELS[workspace.status]

  // 프리페칭: 호버 시 미리 데이터 로드
  const handleMouseEnter = () => {
    if (workspace.status === 'ready' && !isHovering) {
      setIsHovering(true)
      // 미리 워크스페이스 데이터와 리포트 캐시 조회
      Promise.all([
        fetch(`/api/workspaces/${workspace.id}`).catch(() => null),
        fetch(`/api/workspaces/${workspace.id}/report?range=7d`).catch(() => null),
      ]).catch(() => {
        // 프리페칭 실패는 무시 (사용자 경험에 영향 없음)
      })
    }
  }

  const content = (
    <div
      className={cn(
        'p-6 h-full rounded-2xl border transition-all duration-300',
        workspace.status === 'ready'
          ? 'bg-surface border-border/10 hover:border-border/30 hover:bg-surface-strong cursor-pointer'
          : 'bg-surface-inset/50 border-border/10',
        className
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl shrink-0">{purpose.icon}</span>
          <h3 className="font-semibold text-foreground truncate">{workspace.name}</h3>
        </div>
        <span className={cn('text-xs px-2 py-1 rounded-full shrink-0', purpose.color)}>
          {purpose.label}
        </span>
      </div>

      {/* Data Sources */}
      <div className="flex flex-wrap gap-2 mb-3">
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

      {/* Footer */}
      <div className="flex justify-between items-center text-sm">
        <span className={status.color}>{status.label}</span>
        <span className="text-subtle">
          {new Date(workspace.created_at!).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  )

  // If onClick is provided, use button; otherwise use Link
  if (onClick) {
    return content
  }

  // Use slug if available, otherwise fallback to ID for backward compatibility
  const wsSlugOrId = workspace.slug || workspace.id
  const href = workspace.status === 'ready'
    ? `/projects/${projectSlug}/workspaces/${wsSlugOrId}`
    : `/projects/${projectSlug}/workspaces/${wsSlugOrId}`

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  )
}
