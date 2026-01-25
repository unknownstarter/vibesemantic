/**
 * Caching layer for metric definitions
 * In-memory cache with TTL support
 * Note: For production with multiple instances, consider Redis
 */

import { createClient } from '@/lib/supabase/server'
import type { MetricDefinition } from '@/types/database'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// In-memory cache
const cache = new Map<string, CacheEntry<MetricDefinition[]>>()

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY_PREFIX = 'metrics:'

/**
 * Generate cache key for a project
 */
function getCacheKey(projectId: string): string {
  return `${CACHE_KEY_PREFIX}${projectId}`
}

/**
 * Check if cache entry is valid (not expired)
 */
function isValidEntry<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return entry !== undefined && entry.expiresAt > Date.now()
}

/**
 * Get cached metric definitions for a project
 * Returns cached data if available and not expired, otherwise fetches from DB
 */
export async function getCachedMetricDefinitions(
  projectId: string
): Promise<MetricDefinition[]> {
  const cacheKey = getCacheKey(projectId)
  const cached = cache.get(cacheKey)

  // Cache hit - return cached data
  if (isValidEntry(cached)) {
    return cached.data
  }

  // Cache miss - fetch from database
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

  // Store in cache
  cache.set(cacheKey, {
    data: definitions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return definitions
}

/**
 * Get metric definitions with custom TTL
 */
export async function getCachedMetricDefinitionsWithTTL(
  projectId: string,
  ttlMs: number
): Promise<MetricDefinition[]> {
  const cacheKey = getCacheKey(projectId)
  const cached = cache.get(cacheKey)

  if (isValidEntry(cached)) {
    return cached.data
  }

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

  cache.set(cacheKey, {
    data: definitions,
    expiresAt: Date.now() + ttlMs,
  })

  return definitions
}

/**
 * Invalidate cache for a specific project
 * Call this when metric_definitions are modified
 */
export function invalidateMetricCache(projectId: string): void {
  const cacheKey = getCacheKey(projectId)
  cache.delete(cacheKey)
}

/**
 * Invalidate all metric caches
 * Use for debugging or when bulk changes are made
 */
export function clearAllMetricCache(): void {
  const keysToDelete: string[] = []

  for (const key of cache.keys()) {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      keysToDelete.push(key)
    }
  }

  for (const key of keysToDelete) {
    cache.delete(key)
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number
  keys: string[]
  validEntries: number
} {
  const now = Date.now()
  let validEntries = 0

  for (const entry of cache.values()) {
    if (entry.expiresAt > now) {
      validEntries++
    }
  }

  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    validEntries,
  }
}

/**
 * Pre-warm cache for a project
 * Useful for ensuring cache is populated before heavy operations
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
