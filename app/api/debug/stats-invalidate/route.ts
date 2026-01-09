import { NextResponse } from "next/server";
import statsCache from "@/lib/stats-cache";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }

  const before = await statsCache.getStatsCacheDebug();
  statsCache.invalidateStatsCache();
  const after = await statsCache.getStatsCacheDebug();

  return NextResponse.json({ invalidated: true, before, after });
}
