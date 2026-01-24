'use client'

import { useMemo } from 'react'
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/shared/lib/utils'

export interface RadarChartDataPoint {
  subject: string
  value: number
  fullMark?: number
}

interface RadarChartProps {
  data: RadarChartDataPoint[]
  height?: number
  glow?: boolean
  color?: string
  fillOpacity?: number
  className?: string
}

const DEFAULT_COLOR = '#22c55e'

// 커스텀 툴팁
function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: RadarChartDataPoint }>
}) {
  if (!active || !payload?.length) return null

  const data = payload[0]

  return (
    <div className="bg-surface/95 backdrop-blur-sm border border-border/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted mb-1">{data.payload.subject}</p>
      <p className="text-sm font-medium text-foreground">
        {typeof data.value === 'number' 
          ? data.value.toLocaleString() 
          : data.value}
      </p>
    </div>
  )
}

export function RadarChart({
  data,
  height = 250,
  glow = true,
  color = DEFAULT_COLOR,
  fillOpacity = 0.3,
  className,
}: RadarChartProps) {
  const glowFilterId = useMemo(() => `radar-glow-${Math.random().toString(36).slice(2)}`, [])

  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-inset/30 rounded-xl', className)} style={{ height }}>
        <p className="text-sm text-muted">데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          {/* Glow 필터 */}
          {glow && (
            <defs>
              <filter id={glowFilterId}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feFlood floodColor={color} floodOpacity="0.6" result="glowColor" />
                <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}

          <PolarGrid
            stroke="hsl(var(--border))"
            strokeOpacity={0.2}
          />

          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />

          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickFormatter={(value) => {
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
              return value.toString()
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Radar
            name="Value"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={fillOpacity}
            filter={glow ? `url(#${glowFilterId})` : undefined}
            dot={{
              r: 3,
              fill: color,
              stroke: 'hsl(var(--background))',
              strokeWidth: 1,
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}
