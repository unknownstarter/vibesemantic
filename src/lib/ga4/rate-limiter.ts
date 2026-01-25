/**
 * GA4 API Rate Limiter
 * Handles rate limiting and retry logic for Google Analytics Data API
 *
 * GA4 Data API Limits:
 * - 200 requests per user per day (free tier)
 * - 10 requests per second per user
 */

// Simple token bucket rate limiter
class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per ms

  constructor(maxTokens: number, refillPerSecond: number) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.lastRefill = Date.now()
    this.refillRate = refillPerSecond / 1000
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    // Wait for a token to become available
    const waitTime = (1 - this.tokens) / this.refillRate
    await sleep(Math.ceil(waitTime))
    this.refill()
    this.tokens -= 1
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }
}

// Global rate limiter instance (10 requests per second)
const ga4RateLimiter = new TokenBucket(10, 10)

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is a quota/rate limit error
 */
export function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('resource exhausted') ||
      message.includes('429')
    )
  }
  return false
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isQuotaError(error)) return true

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('socket') ||
      message.includes('503') ||
      message.includes('500')
    )
  }
  return false
}

/**
 * Execute function with rate limiting
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>
): Promise<T> {
  await ga4RateLimiter.acquire()
  return fn()
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    onRetry?: (error: unknown, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error
      }

      // Don't retry if we've exhausted retries
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * 0.3 * exponentialDelay
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

      // Extra delay for quota errors
      const finalDelay = isQuotaError(error) ? delay * 2 : delay

      onRetry?.(error, attempt + 1)
      console.log(`[GA4] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(finalDelay)}ms`)

      await sleep(finalDelay)
    }
  }

  throw lastError
}

/**
 * Execute function with both rate limiting and retry
 */
export async function withRateLimitAndRetry<T>(
  fn: () => Promise<T>,
  options?: Parameters<typeof withRetry>[1]
): Promise<T> {
  return withRetry(() => withRateLimit(fn), options)
}

/**
 * Batch execute multiple functions with rate limiting
 * Useful for running multiple GA4 API calls
 */
export async function batchWithRateLimit<T>(
  fns: Array<() => Promise<T>>,
  options?: {
    concurrency?: number
  }
): Promise<T[]> {
  const { concurrency = 3 } = options ?? {}
  const results: T[] = []
  const queue = [...fns]

  const workers = Array(Math.min(concurrency, queue.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const fn = queue.shift()
        if (fn) {
          const result = await withRateLimit(fn)
          results.push(result)
        }
      }
    })

  await Promise.all(workers)
  return results
}

/**
 * Daily quota tracker (simple in-memory tracking)
 * Note: For production, consider using Redis or DB storage
 */
class QuotaTracker {
  private requestCount = 0
  private resetDate: string

  constructor() {
    this.resetDate = this.getTodayDate()
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  increment(): void {
    const today = this.getTodayDate()
    if (today !== this.resetDate) {
      this.requestCount = 0
      this.resetDate = today
    }
    this.requestCount++
  }

  getCount(): number {
    const today = this.getTodayDate()
    if (today !== this.resetDate) {
      return 0
    }
    return this.requestCount
  }

  getRemainingQuota(dailyLimit = 200): number {
    return Math.max(0, dailyLimit - this.getCount())
  }

  isQuotaAvailable(dailyLimit = 200): boolean {
    return this.getCount() < dailyLimit
  }
}

export const ga4QuotaTracker = new QuotaTracker()

/**
 * Execute with quota tracking
 */
export async function withQuotaTracking<T>(
  fn: () => Promise<T>,
  dailyLimit = 200
): Promise<T> {
  if (!ga4QuotaTracker.isQuotaAvailable(dailyLimit)) {
    throw new Error(`GA4 daily quota exceeded. Remaining: ${ga4QuotaTracker.getRemainingQuota(dailyLimit)}`)
  }

  ga4QuotaTracker.increment()
  return fn()
}

/**
 * Full GA4 API call wrapper with rate limiting, retry, and quota tracking
 */
export async function executeGA4Request<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number
    skipQuotaCheck?: boolean
    dailyLimit?: number
  }
): Promise<T> {
  const { skipQuotaCheck = false, dailyLimit = 200, ...retryOptions } = options ?? {}

  if (!skipQuotaCheck && !ga4QuotaTracker.isQuotaAvailable(dailyLimit)) {
    throw new Error(`GA4 daily quota exceeded (${ga4QuotaTracker.getCount()}/${dailyLimit})`)
  }

  const result = await withRateLimitAndRetry(fn, retryOptions)
  ga4QuotaTracker.increment()

  return result
}
