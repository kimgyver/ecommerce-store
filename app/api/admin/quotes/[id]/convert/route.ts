import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import statsCache from "@/lib/stats-cache";
import { computeStatistics } from "@/app/api/admin/statistics/route";

// POST /api/admin/quotes/[id]/convert - Convert quote to order
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = params.id;
  // Find the quote
  const quote = await prisma.quoteRequest.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status === "ordered" && quote.orderId) {
    return NextResponse.json(
      { error: "Quote already converted to order" },
      { status: 400 }
    );
  }

  if (quote.orderId) {
    // delete existing order
    await prisma.order.delete({ where: { id: quote.orderId } });
  }

  try {
    const priceEach =
      typeof quote.price === "number" ? quote.price : Number(quote.price) || 0;
    const order = await prisma.order.create({
      data: {
        userId: quote.requesterId,
        totalPrice: priceEach * (quote.quantity || 1),
        status: "pending_payment",
        items: {
          create: [
            {
              productId: quote.productId,
              quantity: quote.quantity || 1,
              price: priceEach
            }
          ]
        }
      }
    });
    // Update quote with orderId and status
    await prisma.quoteRequest.update({
      where: { id },
      data: {
        status: "ordered",
        orderId: order.id
      }
    });
    // Invalidate stats cache and warm it asynchronously
    try {
      statsCache.invalidateStatsCache();
      // maybe warm the cache in background
      statsCache
        .maybeWarmStats(computeStatistics)
        .catch(err =>
          console.error("Failed to warm stats after quote convert:", err)
        );
    } catch (e) {
      console.error("Error invalidating/warming stats cache:", e);
    }
    // fetch updated quote including relations to return to client
    const updatedQuote = await prisma.quoteRequest.findUnique({
      where: { id },
      include: { product: true, requester: true }
    });
    return NextResponse.json({ quote: updatedQuote, order });
  } catch {
    return NextResponse.json(
      { error: "Failed to convert quote to order" },
      { status: 500 }
    );
  }
}
