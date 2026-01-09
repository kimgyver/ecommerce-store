import statsCache from "../lib/stats-cache.js";
import { computeStatistics } from "../app/api/admin/statistics/route.js";

(async () => {
  console.log("Warming stats (first time)...");
  const start = Date.now();
  await statsCache.warmStats(computeStatistics);
  console.log("Warmed in", Date.now() - start, "ms");
  console.log("Cache debug:", statsCache.getStatsCacheDebug());

  console.log("Fetching cached stats (should be immediate)");
  const t0 = Date.now();
  await statsCache.getCachedStats(computeStatistics);
  console.log("Fetched in", Date.now() - t0, "ms");
})();
