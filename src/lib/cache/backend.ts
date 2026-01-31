/**
 * Cache backend abstraction (CACHE_AND_ASSETS.md § 4.3)
 * 환경 변수 CACHE_BACKEND=memory|redis 로 선택. 미설정 시 memory.
 * Redis 사용 시: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN 필요.
 */

import { createInMemoryBackend } from './in-memory-backend'
import { createRedisBackend } from './redis-backend'

export interface CacheStats {
  size: number
  keys: string[]
  validEntries: number
}

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
  /** prefix로 시작하는 키 일괄 삭제 (무효화·디버깅용) */
  clearPrefix(prefix: string): Promise<void>
  /** 인메모리 전용: 통계. Redis 등은 undefined 반환 가능 */
  getStats?(): Promise<CacheStats>
}

let defaultBackend: CacheBackend | null = null

export function getDefaultBackend(): CacheBackend {
  if (!defaultBackend) {
    if (process.env.CACHE_BACKEND === 'redis' && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      defaultBackend = createRedisBackend()
    } else {
      defaultBackend = createInMemoryBackend()
    }
  }
  return defaultBackend
}

/** 테스트/리셋용: 기본 백엔드 초기화 */
export function resetDefaultBackend(): void {
  defaultBackend = null
}
