/**
 * Project-level feature flags
 * DB-based flags for gradual rollout and A/B testing
 */

import { createClient } from '@/lib/supabase/server'
import type { FeatureFlags, Json } from '@/types/database'

// In-memory cache for feature flags (short TTL)
const flagsCache = new Map<string, { flags: FeatureFlags; expiresAt: number }>()
const FLAGS_CACHE_TTL_MS = 60 * 1000 // 1 minute (shorter than metric cache)

/**
 * Get feature flags for a project
 */
export async function getProjectFeatureFlags(
  projectId: string
): Promise<FeatureFlags> {
  const cacheKey = `flags:${projectId}`
  const cached = flagsCache.get(cacheKey)

  // Cache hit
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flags
  }

  // Cache miss - fetch from DB
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

  // Cache the result
  flagsCache.set(cacheKey, {
    flags,
    expiresAt: Date.now() + FLAGS_CACHE_TTL_MS,
  })

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

  // Get current flags
  const currentFlags = await getProjectFeatureFlags(projectId)

  // Merge with new flags
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

  // Invalidate cache
  flagsCache.delete(`flags:${projectId}`)
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
 * Invalidate feature flags cache for a project
 */
export function invalidateFlagsCache(projectId: string): void {
  flagsCache.delete(`flags:${projectId}`)
}

/**
 * Clear all feature flags cache
 */
export function clearAllFlagsCache(): void {
  flagsCache.clear()
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
