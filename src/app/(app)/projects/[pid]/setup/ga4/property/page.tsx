'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/Button'
import type { GA4Property } from '@/types/database'

// Spinner Component
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// Sad Face Icon
function SadFaceIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function GA4PropertyPage() {
  const params = useParams()
  const router = useRouter()
  const projectSlug = params.pid as string // Can be slug or UUID for backward compatibility

  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/ga4/properties?projectId=${projectSlug}`)
      .then(res => res.json())
      .then(data => {
        setProperties(data.properties || [])
        const selected = data.properties?.find((p: GA4Property) => p.is_selected)
        if (selected) setSelectedId(selected.property_id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectSlug])

  const handleSelect = async () => {
    if (!selectedId) return
    setSaving(true)

    try {
      const res = await fetch('/api/ga4/properties/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectSlug, propertyId: selectedId }),
      })

      if (!res.ok) throw new Error('Failed to select property')

      router.push(`/projects/${projectSlug}/setup/refresh`)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <span>프로젝트 설정</span>
          <span>/</span>
          <span>2. GA4 연동</span>
          <span>/</span>
          <span className="text-foreground">Property 선택</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">GA4 Property 선택</h1>
        <p className="text-muted mt-1">분석할 GA4 Property를 선택하세요</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border/10 p-6">
        {properties.length === 0 ? (
          <div className="text-center py-8">
            <SadFaceIcon className="w-12 h-12 mx-auto text-subtle mb-4" />
            <h3 className="font-medium text-foreground mb-2">Property가 없습니다</h3>
            <p className="text-sm text-muted mb-6">
              연결된 Google 계정에 접근 가능한 GA4 Property가 없습니다
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push(`/projects/${projectSlug}/setup/ga4/connect`)}
            >
              다른 계정으로 연결
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {properties.map((property) => (
                <label
                  key={property.property_id}
                  className={`flex items-center p-4 rounded-xl border cursor-pointer transition ${
                    selectedId === property.property_id
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/10 hover:border-border/30 bg-surface-inset'
                  }`}
                >
                  <input
                    type="radio"
                    name="property"
                    value={property.property_id}
                    checked={selectedId === property.property_id}
                    onChange={() => setSelectedId(property.property_id)}
                    className="w-4 h-4 text-primary bg-surface-inset border-border/30 focus:ring-primary/40"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-foreground">{property.property_name}</div>
                    <div className="text-sm text-muted">ID: {property.property_id}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button variant="secondary" onClick={() => router.back()}>
                이전
              </Button>
              <Button
                onClick={handleSelect}
                disabled={!selectedId || saving}
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    저장 중...
                  </span>
                ) : (
                  '다음: 데이터 동기화'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
