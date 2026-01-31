/**
 * Caching layer for metric definitions
 * Backend: in-memory or Redis (CACHE_BACKEND=redis). Policy: CACHE_AND_ASSETS.md
 */

import { createClient } from '@/lib/supabase/server'
import type { MetricDefinition } from '@/types/database'
import { getDefaultBackend } from './backend'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY_PREFIX = 'metrics:'

function getCacheKey(projectId: string): string {
  return `${CACHE_KEY_PREFIX}${projectId}`
}

/**
 * Get cached metric definitions for a project
 */
export async function getCachedMetricDefinitions(
  projectId: string
): Promise<MetricDefinition[]> {
  const backend = getDefaultBackend()
  const cacheKey = getCacheKey(projectId)
  const cached = await backend.get<MetricDefinition[]>(cacheKey)
  if (cached != null) return cached

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('metric_definitions')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    console.error('[MetricCache] Failed to fetch metric definitions:', error)
    return []
  }

  const definitions = (data ?? []) as MetricDefinition[]
  await backend.set(cacheKey, definitions, CACHE_TTL_MS)
  return definitions
}

/**
 * Get metric definitions with custom TTL
 */
export async function getCachedMetricDefinitionsWithTTL(
  projectId: string,
  ttlMs: number
): Promise<MetricDefinition[]> {
  const backend = getDefaultBackend()
  const cacheKey = getCacheKey(projectId)
  const cached = await backend.get<MetricDefinition[]>(cacheKey)
  if (cached != null) return cached

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('metric_definitions')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    console.error('[MetricCache] Failed to fetch metric definitions:', error)
    return []
  }

  const definitions = (data ?? []) as MetricDefinition[]
  await backend.set(cacheKey, definitions, ttlMs)
  return definitions
}

/**
 * Invalidate cache for a specific project. Call when metric_definitions are modified.
 */
export async function invalidateMetricCache(projectId: string): Promise<void> {
  const backend = getDefaultBackend()
  await backend.delete(getCacheKey(projectId))
}

/**
 * Invalidate all metric caches (prefix metrics:). Use for debugging or bulk changes.
 */
export async function clearAllMetricCache(): Promise<void> {
  const backend = getDefaultBackend()
  await backend.clearPrefix(CACHE_KEY_PREFIX)
}

/**
 * Get cache statistics (in-memory only; Redis returns empty stats)
 */
export async function getCacheStats(): Promise<{
  size: number
  keys: string[]
  validEntries: number
}> {
  const backend = getDefaultBackend()
  const stats = await backend.getStats?.()
  if (stats) return stats
  return { size: 0, keys: [], validEntries: 0 }
}

/**
 * Pre-warm cache for a project
 */
export async function prewarmCache(projectId: string): Promise<void> {
  await getCachedMetricDefinitions(projectId)
}

/**
 * Batch pre-warm cache for multiple projects
 */
export async function prewarmCacheBatch(projectIds: string[]): Promise<void> {
  await Promise.all(projectIds.map(id => prewarmCache(id)))
}
