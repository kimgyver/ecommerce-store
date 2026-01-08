// app/api/cron/payment-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processPaymentReminders } from "@/lib/payment-reminders";

// This endpoint should be called by a cron job daily
// Vercel Cron: https://vercel.com/docs/cron-jobs
// Or use external services like cron-job.org, EasyCron, etc.

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Payment reminders job started");
    const startTime = Date.now();

    // Process all payment reminders
    const result = await processPaymentReminders();

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Payment reminders job completed in ${duration}ms`,
      result
    );

    return NextResponse.json({
      ...result,
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Cron] Payment reminders job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
