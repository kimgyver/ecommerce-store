const DEFAULT_TTL_MS = Number(process.env.STATS_CACHE_TTL_MS) || 30_000; // 30s default

type CacheEntry = { value: any; expiresAt: number } | null;

let statsCache: CacheEntry = null;

export function getCachedStats(fetcher: () => Promise<any>) {
  const now = Date.now();
  if (statsCache && statsCache.expiresAt > now) {
    // cached hit
    return Promise.resolve(statsCache.value);
  }
  // compute and cache
  return warmStats(fetcher);
}

export async function warmStats(fetcher: () => Promise<any>) {
  try {
    const start = Date.now();
    console.time("stats:compute");
    const value = await fetcher();
    console.timeEnd("stats:compute");
    const duration = Date.now() - start;
    // set cache
    statsCache = { value, expiresAt: Date.now() + DEFAULT_TTL_MS };
    console.log(`stats warmed (took ${duration}ms), ttl=${DEFAULT_TTL_MS}ms`);
    return value;
  } catch (e) {
    console.error("Failed to warm stats cache", e);
    throw e;
  }
}

export function invalidateStatsCache() {
  statsCache = null;
  console.log("stats cache invalidated");
}

export function getStatsCacheDebug() {
  return statsCache ? { expiresAt: statsCache.expiresAt } : null;
}

export function peekCachedStats() {
  return statsCache ? statsCache.value : null;
}

/**
 * Conditionally warm stats based on the feature flag STATS_WARM_ON_WRITE.
 * Default behavior: warming is enabled unless STATS_WARM_ON_WRITE === 'false'.
 */
export function maybeWarmStats(fetcher: () => Promise<any>) {
  const env = process.env.STATS_WARM_ON_WRITE;
  const enabled = env === undefined ? true : env !== "false";
  if (!enabled) {
    console.log("stats warm skipped due to STATS_WARM_ON_WRITE=false");
    return Promise.resolve();
  }
  return warmStats(fetcher);
}

export default {
  getCachedStats,
  warmStats,
  invalidateStatsCache,
  getStatsCacheDebug,
  peekCachedStats,
  maybeWarmStats
};
