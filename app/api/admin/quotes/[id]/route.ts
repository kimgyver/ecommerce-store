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
  return NextResponse.json(updatedWithRelations);
}
import { NextRequest, NextResponse } from "next/server";
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
