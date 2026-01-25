'use client'

export function SkeletonReport() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Key Insights Skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-surface-inset rounded-lg w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-surface-inset rounded w-full" />
          <div className="h-4 bg-surface-inset rounded w-5/6" />
          <div className="h-4 bg-surface-inset rounded w-4/6" />
        </div>
      </div>

      {/* Critical Issues Skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-surface-inset rounded-lg w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-surface-inset rounded w-full" />
          <div className="h-4 bg-surface-inset rounded w-3/4" />
        </div>
      </div>

      {/* Recommended Actions Skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-surface-inset rounded-lg w-1/4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-surface-inset rounded-xl border border-border/10">
              <div className="h-5 bg-surface rounded w-2/3 mb-2" />
              <div className="space-y-2 mt-3">
                <div className="h-3 bg-surface rounded w-1/4" />
                <div className="h-3 bg-surface rounded w-1/4" />
                <div className="h-3 bg-surface rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-surface-inset rounded-lg w-1/4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-surface-inset rounded-xl border border-border/10" />
          <div className="h-48 bg-surface-inset rounded-xl border border-border/10" />
        </div>
      </div>
    </div>
  )
}
