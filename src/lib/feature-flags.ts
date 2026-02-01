/**
 * Project-level feature flags
 * DB-based flags for gradual rollout and A/B testing
 * Cache backend: in-memory or Redis (CACHE_AND_ASSETS.md)
 */

import { createClient } from '@/lib/supabase/server'
import type { FeatureFlags, Json } from '@/types/database'
import { getDefaultBackend } from '@/lib/cache/backend'

const FLAGS_CACHE_TTL_MS = 60 * 1000 // 1 minute
const FLAGS_CACHE_KEY_PREFIX = 'flags:'

function getCacheKey(projectId: string): string {
  return `${FLAGS_CACHE_KEY_PREFIX}${projectId}`
}

/**
 * Get feature flags for a project.
 * Cache failure (e.g. Redis WRONGPASS) is ignored; falls back to DB.
 */
export async function getProjectFeatureFlags(
  projectId: string
): Promise<FeatureFlags> {
  const backend = getDefaultBackend()
  const cacheKey = getCacheKey(projectId)
  try {
    const cached = await backend.get<FeatureFlags>(cacheKey)
    if (cached != null) return cached
  } catch (e) {
    console.warn('[FeatureFlags] Cache get failed, using DB:', e instanceof Error ? e.message : e)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('feature_flags')
    .eq('id', projectId)
    .single()

  if (error) {
    console.error('[FeatureFlags] Failed to fetch flags:', error)
    return {}
  }

  const flags = (data?.feature_flags as FeatureFlags) ?? {}
  try {
    await backend.set(cacheKey, flags, FLAGS_CACHE_TTL_MS)
  } catch (e) {
    console.warn('[FeatureFlags] Cache set failed:', e instanceof Error ? e.message : e)
  }
  return flags
}

/**
 * Check if semantic layer is enabled for a project
 */
export async function isSemanticLayerEnabled(projectId: string): Promise<boolean> {
  const flags = await getProjectFeatureFlags(projectId)
  return flags.semanticLayer ?? false
}

/**
 * Check if event collection is enabled for a project
 */
export async function isEventCollectionEnabled(projectId: string): Promise<boolean> {
  const flags = await getProjectFeatureFlags(projectId)
  return flags.eventCollection ?? false
}

/**
 * Update feature flags for a project
 */
export async function updateProjectFeatureFlags(
  projectId: string,
  flags: Partial<FeatureFlags>
): Promise<void> {
  const supabase = await createClient()

  const currentFlags = await getProjectFeatureFlags(projectId)
  const updatedFlags: FeatureFlags = {
    ...currentFlags,
    ...flags,
  }

  const { error } = await supabase
    .from('projects')
    .update({ feature_flags: updatedFlags as unknown as Json })
    .eq('id', projectId)

  if (error) {
    throw new Error(`Failed to update feature flags: ${error.message}`)
  }

  await invalidateFlagsCache(projectId)
}

/**
 * Enable semantic layer for a project
 */
export async function enableSemanticLayer(projectId: string): Promise<void> {
  await updateProjectFeatureFlags(projectId, { semanticLayer: true })
}

/**
 * Disable semantic layer for a project
 */
export async function disableSemanticLayer(projectId: string): Promise<void> {
  await updateProjectFeatureFlags(projectId, { semanticLayer: false })
}

/**
 * Enable event collection for a project
 */
export async function enableEventCollection(projectId: string): Promise<void> {
  await updateProjectFeatureFlags(projectId, { eventCollection: true })
}

/**
 * Disable event collection for a project
 */
export async function disableEventCollection(projectId: string): Promise<void> {
  await updateProjectFeatureFlags(projectId, { eventCollection: false })
}

/**
 * Invalidate feature flags cache for a project.
 * Cache failure is ignored (e.g. Redis WRONGPASS).
 */
export async function invalidateFlagsCache(projectId: string): Promise<void> {
  try {
    const backend = getDefaultBackend()
    await backend.delete(getCacheKey(projectId))
  } catch (e) {
    console.warn('[FeatureFlags] Cache invalidate failed:', e instanceof Error ? e.message : e)
  }
}

/**
 * Clear all feature flags cache (prefix flags:).
 * Cache failure is ignored.
 */
export async function clearAllFlagsCache(): Promise<void> {
  try {
    const backend = getDefaultBackend()
    await backend.clearPrefix(FLAGS_CACHE_KEY_PREFIX)
  } catch (e) {
    console.warn('[FeatureFlags] Cache clearPrefix failed:', e instanceof Error ? e.message : e)
  }
}

/**
 * Check multiple flags at once (reduces DB queries)
 */
export async function checkFlags(
  projectId: string,
  ...flagNames: (keyof FeatureFlags)[]
): Promise<Record<keyof FeatureFlags, boolean>> {
  const flags = await getProjectFeatureFlags(projectId)

  const result: Record<string, boolean> = {}
  for (const name of flagNames) {
    result[name] = flags[name] ?? false
  }

  return result as Record<keyof FeatureFlags, boolean>
}
