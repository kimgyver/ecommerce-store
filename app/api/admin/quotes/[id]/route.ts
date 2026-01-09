// PATCH /api/admin/quotes/[id] - Change quote request status
// Request body: { status: "quoted" | "ordered" | "cancelled" | ... }
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // params can be a Promise (in Next.js dynamic routes), so await is required
  const params = await context.params;
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = params.id;
  let body: { status?: string; note?: string; price?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }
  // Change status and append to history
  const quote = await prisma.quoteRequest.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Load existing history (JSON)
  const history = Array.isArray(quote.history) ? quote.history : [];
  // Add new event
  history.push({
    status: body.status,
    changedBy: session.user.email,
    timestamp: new Date().toISOString(),
    note: body.note || null
  });
  const updated = await prisma.quoteRequest.update({
    where: { id },
    data: {
      status: body.status,
      price: body.price,
      history
    }
  });
  // Return with related product & requester included so the client keeps displaying them
  const updatedWithRelations = await prisma.quoteRequest.findUnique({
    where: { id: updated.id },
    include: { product: true, requester: true }
  });
  // Invalidate & warm stats cache (quote status change affects conversion & aging)
  try {
    // import lazily to avoid top-level import order issues
    const stats = await import("@/lib/stats-cache");
    const statsRoutes = await import("@/app/api/admin/statistics/route");
    stats.default.invalidateStatsCache();
    stats.default
      .maybeWarmStats(statsRoutes.computeStatistics)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Failed to warm stats after quote patch:", msg, err);
      });
  } catch (e) {
    console.error(
      "Error invalidating/warming stats cache after quote patch:",
      e
    );
  }
  return NextResponse.json(updatedWithRelations);
}
import { NextRequest, NextResponse } from "next/server";
// Note: stats cache is warmed lazily from handlers to avoid load-order issues
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/admin/quotes/[id] - Get quote request detail
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // In Next.js app directory dynamic routes, params can be a Promise, so await is required
  const params = await context.params;
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quote = await prisma.quoteRequest.findUnique({
    where: { id: params.id },
    include: {
      product: true,
      requester: true
    }
  });
  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(quote);
}
