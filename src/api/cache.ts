/**
 * 인메모리 TTL 캐시
 *
 * API 응답을 캐싱하여 불필요한 네트워크 요청을 줄입니다.
 * 각 엔트리는 TTL(초) 후 자동 만료됩니다.
 */

import type { CacheConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
  readonly staleAt?: number;
}

export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
}

export interface Cache {
  get<T>(key: string): T | undefined;
  /** Stale-While-Revalidate: 만료 데이터 즉시 반환, revalidateFn을 백그라운드 실행 */
  getOrRevalidate<T>(key: string, revalidateFn: () => Promise<T>, ttlSeconds: number): T | undefined;
  set<T>(key: string, data: T, ttlSeconds: number): void;
  invalidate(key: string): void;
  clear(): void;
  stats(): CacheStats;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCache(config: CacheConfig): Cache {
  const store = new Map<string, CacheEntry<unknown>>();
  let hits = 0;
  let misses = 0;

  function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /** 백그라운드 갱신 진행 중인 키 (중복 갱신 방지) */
  const revalidating = new Set<string>();

  function get<T>(key: string): T | undefined {
    if (!config.enabled) {
      misses += 1;
      return undefined;
    }

    const entry = store.get(key);
    if (!entry) {
      misses += 1;
      return undefined;
    }

    if (isExpired(entry)) {
      store.delete(key);
      misses += 1;
      return undefined;
    }

    // LRU: move to end of Map insertion order (most recently used)
    store.delete(key);
    store.set(key, entry);

    hits += 1;
    return entry.data as T;
  }

  function getOrRevalidate<T>(
    key: string,
    revalidateFn: () => Promise<T>,
    ttlSeconds: number,
  ): T | undefined {
    if (!config.enabled) return undefined;

    const entry = store.get(key);
    if (!entry) return undefined;

    // 아직 유효 — 일반 get과 동일
    if (!isExpired(entry)) {
      store.delete(key);
      store.set(key, entry);
      hits += 1;
      return entry.data as T;
    }

    // 만료됨 — stale 데이터 즉시 반환하면서 백그라운드 갱신
    hits += 1;

    if (!revalidating.has(key)) {
      revalidating.add(key);
      revalidateFn()
        .then((freshData) => {
          set(key, freshData, ttlSeconds);
        })
        .catch(() => {
          // 갱신 실패 시 stale 데이터 유지 (TTL 연장)
          store.delete(key);
          store.set(key, { ...entry, expiresAt: Date.now() + 60_000 });
        })
        .finally(() => {
          revalidating.delete(key);
        });
    }

    return entry.data as T;
  }

  function evictOldest(): void {
    // Map은 삽입 순서를 유지 — 첫 번째 엔트리가 가장 오래됨
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  function set<T>(key: string, data: T, ttlSeconds: number): void {
    if (!config.enabled) return;

    // LRU: maxEntries 초과 시 가장 오래된 엔트리 제거 (기본 500)
    const maxEntries = 500;
    while (store.size >= maxEntries) {
      evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    store.set(key, entry);
  }

  function invalidate(key: string): void {
    store.delete(key);
  }

  function clear(): void {
    store.clear();
    hits = 0;
    misses = 0;
  }

  function stats(): CacheStats {
    return { size: store.size, hits, misses };
  }

  return { get, getOrRevalidate, set, invalidate, clear, stats };
}

// ---------------------------------------------------------------------------
// Cache key builder
// ---------------------------------------------------------------------------

export function buildCacheKey(
  apiCode: string,
  params: Record<string, string | number>,
): string {
  const sortedEntries = Object.entries(params)
    .filter(([key]) => key !== "KEY")
    .sort(([a], [b]) => a.localeCompare(b));
  const paramString = sortedEntries
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${apiCode}:${paramString}`;
}
