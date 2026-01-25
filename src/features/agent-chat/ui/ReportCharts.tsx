'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, BarChart, RadarChart } from '@/shared/ui/charts'
import type { LineChartDataPoint } from '@/shared/ui/charts/LineChart'
import type { MartSummary } from '@/lib/langgraph/types'

interface ReportChartsProps {
  martSummary: MartSummary
}

export function ReportCharts({ martSummary }: ReportChartsProps) {
  // 일별 트렌드 데이터 (Line Chart)
  const trendData = useMemo(() => {
    if (!martSummary.dailyTrend?.length) return []
    return martSummary.dailyTrend.map(d => ({
      date: d.date,
      sessions: d.sessions,
      users: d.users,
    }))
  }, [martSummary.dailyTrend])

  // 채널별 세션 (Bar Chart)
  const channelData = useMemo(() => {
    if (!martSummary.topChannels?.length) return []
    return martSummary.topChannels.slice(0, 5).map(ch => ({
      name: ch.name.length > 10 ? ch.name.slice(0, 10) + '...' : ch.name,
      value: ch.sessions,
    }))
  }, [martSummary.topChannels])

  // 페이지별 참여율 (Radar Chart) - 상위 5개
  const pageData = useMemo(() => {
    if (!martSummary.topPages?.length) return []
    return martSummary.topPages.slice(0, 5).map(p => {
      // 페이지 경로에서 이름 추출
      const pathParts = p.path.split('/').filter(Boolean)
      const pageName = p.title 
        ? (p.title.length > 15 ? p.title.slice(0, 15) + '...' : p.title)
        : (pathParts[pathParts.length - 1] || 'Home')
      
      return {
        subject: pageName.length > 12 ? pageName.slice(0, 12) + '...' : pageName,
        value: Math.round(p.engagementRate * 100),
        fullMark: 100,
      }
    })
  }, [martSummary.topPages])

  // CSV 메트릭 트렌드 (통합 분석)
  const csvTrendData = useMemo((): LineChartDataPoint[] => {
    if (!martSummary.integratedTrend?.length) return []
    return martSummary.integratedTrend.map(d => {
      const point: LineChartDataPoint = { date: d.date }
      if (d.ga4Sessions !== undefined) point.ga4Sessions = d.ga4Sessions
      if (d.csvMetrics) {
        Object.entries(d.csvMetrics).forEach(([key, value]) => {
          point[key] = value
        })
      }
      return point
    })
  }, [martSummary.integratedTrend])

  const csvMetricKeys = useMemo(() => {
    if (!martSummary.csvMetrics) return []
    return Object.keys(martSummary.csvMetrics).slice(0, 2) // 최대 2개
  }, [martSummary.csvMetrics])

  const hasData = trendData.length > 0 || channelData.length > 0

  if (!hasData) return null

  return (
    <div className="space-y-6 mb-6">
      {/* 트렌드 차트 (GA4 데이터) */}
      {trendData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
        >
          <h4 className="text-sm font-medium text-foreground mb-3">📈 일별 트렌드</h4>
          <LineChart
            data={trendData}
            series={[
              { key: 'sessions', name: '세션', color: '#22c55e' },
              { key: 'users', name: '사용자', color: '#3b82f6' },
            ]}
            height={180}
            showLegend
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 채널별 세션 (Bar Chart) */}
        {channelData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
          >
            <h4 className="text-sm font-medium text-foreground mb-3">📊 채널별 세션</h4>
            <BarChart
              data={channelData}
              height={160}
              color="#22c55e"
              horizontal
            />
          </motion.div>
        )}

        {/* 페이지별 참여율 (Radar Chart) */}
        {pageData.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
          >
            <h4 className="text-sm font-medium text-foreground mb-3">🎯 페이지 참여율</h4>
            <RadarChart
              data={pageData}
              height={160}
              color="#8b5cf6"
            />
          </motion.div>
        )}
      </div>

      {/* 통합 분석 차트 (GA4 + CSV) */}
      {csvTrendData.length > 0 && csvMetricKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
        >
          <h4 className="text-sm font-medium text-foreground mb-3">🔗 GA4 + CSV 통합 분석</h4>
          <LineChart
            data={csvTrendData}
            series={[
              { key: 'ga4Sessions', name: 'GA4 세션', color: '#22c55e' },
              ...csvMetricKeys.map((key, i) => ({
                key,
                name: key,
                color: i === 0 ? '#f59e0b' : '#ef4444',
              })),
            ]}
            height={180}
            showLegend
          />
        </motion.div>
      )}
    </div>
  )
}
