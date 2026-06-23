export interface ICacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
  deleteMany(keys: string[]): Promise<void>
  clear(): Promise<void>
}

export class LocalCacheService implements ICacheService {
  private cache = new Map<string, { value: any; expiresAt: number }>()
  private cleanupInterval: number | null = null

  constructor(private readonly maxSize: number = 1000) {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => this.cleanup(), 60_000)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async deleteMany(keys: string[]): Promise<void> {
    keys.forEach(key => this.cache.delete(key))
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

export const cacheService = new LocalCacheService(500)