import { NextResponse } from "next/server";
import statsCache from "@/lib/stats-cache";
import { computeStatistics } from "@/app/api/admin/statistics/route";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }
  const start = Date.now();
  try {
    await statsCache.warmStats(computeStatistics);
    const took = Date.now() - start;
    return NextResponse.json({
      warmed: true,
      tookMs: took,
      cache: statsCache.getStatsCacheDebug()
    });
  } catch (e) {
    console.error("stats-warm error:", e);
    return NextResponse.json(
      { warmed: false, error: String(e) },
      { status: 500 }
    );
  }
}
