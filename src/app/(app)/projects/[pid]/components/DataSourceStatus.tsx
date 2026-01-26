'use client'

import { StatusCard } from '@/shared/ui/StatusCard'
import type { ProjectProfile } from '@/types/database'

interface DataSourceStatusProps {
  ga4?: {
    connected: boolean
    email?: string
    propertyName?: string
  }
  csv?: {
    connected: boolean
    datasetCount?: number
    datasets?: Array<{ id: string; name: string; status: string }>
  }
  projectSlug: string
}

export function DataSourceStatus({ ga4, csv, projectSlug }: DataSourceStatusProps) {
  const hasAnyConnection = ga4?.connected || csv?.connected

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {/* GA4 Status */}
      <StatusCard
        title="Google Analytics 4"
        description="웹사이트 방문자 데이터 분석"
        ga4={ga4}
        href={ga4?.connected
          ? `/projects/${projectSlug}/setup/ga4/property`
          : `/projects/${projectSlug}/setup/ga4/connect`}
        actionLabel={ga4?.connected ? '관리' : '연결하기'}
      />

      {/* CSV Status */}
      <StatusCard
        title="CSV 데이터"
        description="커스텀 데이터 업로드 및 분석"
        csv={{
          connected: csv?.connected || false,
          datasetCount: csv?.datasets?.filter(d => d.status === 'ingested').length || 0,
          datasetName: csv?.datasets?.find(d => d.status === 'ingested')?.name || 
                      (csv?.datasets && csv.datasets.length > 0 ? csv.datasets[0].name : undefined),
        }}
        href={`/projects/${projectSlug}/setup/sources`}
        actionLabel={csv?.connected ? '관리' : '업로드하기'}
      />
    </div>
  )
}
