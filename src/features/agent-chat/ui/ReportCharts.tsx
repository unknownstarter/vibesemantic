'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, BarChart, RadarChart } from '@/shared/ui/charts'
import { Button } from '@/shared/ui/Button'
import type { LineChartDataPoint } from '@/shared/ui/charts/LineChart'
import type { MartSummary } from '@/lib/langgraph/types'
import type { ChartContext } from '@/lib/api/brain-api'
import type { ReportRange } from '@/types/database'

interface ReportChartsProps {
  martSummary: MartSummary
  /** Epic 5.2: "이 숫자에 대해 물어보기" 클릭 시 채팅으로 전달할 컨텍스트 */
  onAskAboutChart?: (context: ChartContext) => void
  currentRange?: ReportRange
}

export function ReportCharts({ martSummary, onAskAboutChart, currentRange = '7d' }: ReportChartsProps) {
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

  // CSV 메트릭 트렌드 (통합 분석: GA4 + CSV)
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

  // P2-2: CSV 전용 프로젝트 — csvMetrics.trend 기반 시계열 차트
  const csvOnlyTrendData = useMemo((): LineChartDataPoint[] => {
    const csv = martSummary.csvMetrics
    if (!csv || martSummary.dailyTrend?.length) return []
    const dateToPoint: Record<string, LineChartDataPoint> = {}
    const keys: string[] = []
    Object.entries(csv).forEach(([metricName, meta]) => {
      const trend = meta?.trend
      if (!Array.isArray(trend)) return
      keys.push(metricName)
      trend.forEach(({ date, value }: { date: string; value: number }) => {
        if (!dateToPoint[date]) dateToPoint[date] = { date }
        dateToPoint[date][metricName] = value
      })
    })
    return Object.values(dateToPoint).sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [martSummary.csvMetrics, martSummary.dailyTrend?.length])

  const csvOnlyMetricKeys = useMemo(() => {
    if (!martSummary.csvMetrics || martSummary.dailyTrend?.length) return []
    return Object.keys(martSummary.csvMetrics).slice(0, 4)
  }, [martSummary.csvMetrics, martSummary.dailyTrend?.length])

  const hasData =
    trendData.length > 0 ||
    channelData.length > 0 ||
    csvOnlyTrendData.length > 0 ||
    (csvTrendData.length > 0 && csvMetricKeys.length > 0)

  if (!hasData) return null

  return (
    <div className="space-y-6 mb-6">
      {/* CSV 전용 시계열 차트 (P2-2) */}
      {csvOnlyTrendData.length > 0 && csvOnlyMetricKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">📈 CSV 시계열</h4>
            {onAskAboutChart && (
              <Button
                variant="secondary"
                size="sm"
                className="text-xs text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                onClick={() => onAskAboutChart({ range: currentRange, chartType: 'trend', label: 'CSV 시계열', metricNames: csvOnlyMetricKeys })}
              >
                이 숫자에 대해 물어보기
              </Button>
            )}
          </div>
          <LineChart
            data={csvOnlyTrendData}
            series={csvOnlyMetricKeys.map((key, i) => ({
              key,
              name: key,
              color: ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][i % 4],
            }))}
            height={180}
            showLegend
          />
        </motion.div>
      )}

      {/* 트렌드 차트 (GA4 데이터) */}
      {trendData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-inset/30 rounded-xl p-4 border border-border/10"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">📈 일별 트렌드</h4>
            {onAskAboutChart && (
              <Button
                variant="secondary"
                size="sm"
                className="text-xs text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                onClick={() => onAskAboutChart({ range: currentRange, chartType: 'trend', label: '일별 트렌드 (세션·사용자)', metricNames: ['sessions', 'users'] })}
              >
                이 숫자에 대해 물어보기
              </Button>
            )}
          </div>
          <LineChart
            data={trendData}
            series={[
              { key: 'sessions', name: '세션', color: '#22c55e' },
              { key: 'users', name: '사용자', color: '#22c55e' },
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
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">📊 채널별 세션</h4>
              {onAskAboutChart && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                  onClick={() => onAskAboutChart({ range: currentRange, chartType: 'channel', label: '채널별 세션', metricNames: channelData.map(c => c.name) })}
                >
                  이 숫자에 대해 물어보기
                </Button>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">🎯 페이지 참여율</h4>
              {onAskAboutChart && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                  onClick={() => onAskAboutChart({ range: currentRange, chartType: 'page', label: '페이지 참여율' })}
                >
                  이 숫자에 대해 물어보기
                </Button>
              )}
            </div>
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">🔗 GA4 + CSV 통합 분석</h4>
              {onAskAboutChart && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs text-primary border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                  onClick={() => onAskAboutChart({ range: currentRange, chartType: 'integrated', label: 'GA4 + CSV 통합', metricNames: ['ga4Sessions', ...csvMetricKeys] })}
                >
                  이 숫자에 대해 물어보기
                </Button>
              )}
          </div>
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
