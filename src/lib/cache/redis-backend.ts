/**
 * Redis cache backend (Upstash Redis). CACHE_BACKEND=redis 일 때 사용.
 * 환경 변수: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis'
import type { CacheBackend } from './backend'

export function createRedisBackend(): CacheBackend {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when CACHE_BACKEND=redis')
  }
  const client = new Redis({ url, token })

  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await client.get(key)
      if (raw == null) return null
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as T
        } catch {
          return raw as unknown as T
        }
      }
      return raw as T
    },

    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      await client.set(key, serialized, { px: ttlMs })
    },

    async delete(key: string): Promise<void> {
      await client.del(key)
    },

    async clearPrefix(prefix: string): Promise<void> {
      const pattern = prefix.endsWith('*') ? prefix : `${prefix}*`
      const keys = await client.keys(pattern)
      if (keys.length > 0) await client.del(...keys)
    },
  }
}
