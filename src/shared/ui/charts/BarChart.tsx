'use client'

import { useMemo } from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { cn } from '@/shared/lib/utils'

export interface BarChartDataPoint {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartDataPoint[]
  height?: number
  showGrid?: boolean
  glow?: boolean
  color?: string
  horizontal?: boolean
  className?: string
}

// 기본 색상
const DEFAULT_COLOR = '#22c55e'

// 커스텀 툴팁
function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: BarChartDataPoint }>
}) {
  if (!active || !payload?.length) return null

  const data = payload[0]

  return (
    <div className="bg-surface/95 backdrop-blur-sm border border-border/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted mb-1">{data.payload.name}</p>
      <p className="text-sm font-medium text-foreground">
        {typeof data.value === 'number' 
          ? data.value.toLocaleString() 
          : data.value}
      </p>
    </div>
  )
}

export function BarChart({
  data,
  height = 200,
  showGrid = true,
  glow = true,
  color = DEFAULT_COLOR,
  horizontal = false,
  className,
}: BarChartProps) {
  const glowFilterId = useMemo(() => `bar-glow-${Math.random().toString(36).slice(2)}`, [])

  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-inset/30 rounded-xl', className)} style={{ height }}>
        <p className="text-sm text-muted">데이터가 없습니다</p>
      </div>
    )
  }

  const ChartComponent = (
    <RechartsBarChart
      data={data}
      layout={horizontal ? 'vertical' : 'horizontal'}
      margin={{ top: 10, right: 10, left: horizontal ? 60 : -20, bottom: 0 }}
    >
      {/* Glow 필터 */}
      {glow && (
        <defs>
          <filter id={glowFilterId}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feFlood floodColor={color} floodOpacity="0.4" result="glowColor" />
            <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
            <feMerge>
              <feMergeNode in="softGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`${glowFilterId}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
      )}

      {showGrid && (
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.1}
          vertical={!horizontal}
          horizontal={horizontal}
        />
      )}

      {horizontal ? (
        <>
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
              return value.toString()
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
        </>
      ) : (
        <>
          <XAxis
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
              return value.toString()
            }}
          />
        </>
      )}

      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />

      <Bar
        dataKey="value"
        radius={[4, 4, 0, 0]}
        filter={glow ? `url(#${glowFilterId})` : undefined}
        fill={glow ? `url(#${glowFilterId}-gradient)` : color}
      >
        {data.map((entry, index) => (
          <Cell key={index} fill={entry.color || color} />
        ))}
      </Bar>
    </RechartsBarChart>
  )

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {ChartComponent}
      </ResponsiveContainer>
    </div>
  )
}
