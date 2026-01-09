import { NextResponse } from "next/server";
import statsCache from "@/lib/stats-cache";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }
  try {
    return NextResponse.json({ cache: statsCache.getStatsCacheDebug() });
  } catch (e) {
    console.error("stats-info error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
