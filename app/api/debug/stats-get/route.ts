import { NextResponse } from "next/server";
import statsCache from "@/lib/stats-cache";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not allowed in production" },
      { status: 403 }
    );
  }

  const value = statsCache.peekCachedStats();
  if (!value) {
    return NextResponse.json({ cached: false }, { status: 204 });
  }

  return NextResponse.json({ cached: true, value });
}
