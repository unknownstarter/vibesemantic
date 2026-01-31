/**
 * In-memory cache backend (Map + TTL)
 */

import type { CacheBackend, CacheStats } from './backend'

interface Entry<T> {
  data: T
  expiresAt: number
}

export function createInMemoryBackend(): CacheBackend {
  const store = new Map<string, Entry<unknown>>()

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key) as Entry<T> | undefined
      if (!entry || entry.expiresAt <= Date.now()) {
        if (entry) store.delete(key)
        return null
      }
      return entry.data
    },

    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      store.set(key, {
        data: value,
        expiresAt: Date.now() + ttlMs,
      })
    },

    async delete(key: string): Promise<void> {
      store.delete(key)
    },

    async clearPrefix(prefix: string): Promise<void> {
      const toDelete: string[] = []
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) toDelete.push(key)
      }
      for (const key of toDelete) store.delete(key)
    },

    async getStats(): Promise<CacheStats> {
      const now = Date.now()
      let validEntries = 0
      const keys: string[] = []
      for (const [key, entry] of store) {
        keys.push(key)
        if (entry.expiresAt > now) validEntries++
      }
      return { size: store.size, keys, validEntries }
    },
  }
}
