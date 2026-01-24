'use client'

import { useMemo } from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/shared/lib/utils'

export interface LineChartDataPoint {
  date: string
  [key: string]: string | number
}

export interface LineChartSeries {
  key: string
  name: string
  color?: string
  glow?: boolean
}

interface LineChartProps {
  data: LineChartDataPoint[]
  series: LineChartSeries[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  glow?: boolean
  className?: string
}

// 기본 색상 팔레트
const DEFAULT_COLORS = [
  '#22c55e', // green (primary)
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

// 커스텀 툴팁
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface/95 backdrop-blur-sm border border-border/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted">{entry.name}:</span>
          <span className="text-sm font-medium text-foreground">
            {typeof entry.value === 'number' 
              ? entry.value.toLocaleString() 
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function LineChart({
  data,
  series,
  height = 200,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  glow = true,
  className,
}: LineChartProps) {
  // Glow 필터 ID 생성
  const glowFilterId = useMemo(() => `glow-${Math.random().toString(36).slice(2)}`, [])

  if (!data.length || !series.length) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-inset/30 rounded-xl', className)} style={{ height }}>
        <p className="text-sm text-muted">데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          {/* Glow 필터 정의 */}
          {glow && (
            <defs>
              {series.map((s, i) => {
                const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                return (
                  <filter key={s.key} id={`${glowFilterId}-${s.key}`}>
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feFlood floodColor={color} floodOpacity="0.5" result="glowColor" />
                    <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                    <feMerge>
                      <feMergeNode in="softGlow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              })}
            </defs>
          )}

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.1}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              // MM/DD 형식으로 변환
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
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

          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend />}

          {series.map((s, i) => {
            const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            const useGlow = glow && (s.glow !== false)

            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: color,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
                filter={useGlow ? `url(#${glowFilterId}-${s.key})` : undefined}
              />
            )
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
