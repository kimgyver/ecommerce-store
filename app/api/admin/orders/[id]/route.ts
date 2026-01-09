import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const orderId = resolved.id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const orderWithShipping = {
      ...order,
      shipping: {
        name: order.recipientName || "",
        phone: order.recipientPhone || "",
        postalCode: order.shippingPostalCode || "",
        address1: order.shippingAddress1 || "",
        address2: order.shippingAddress2 || ""
      }
    };

    return NextResponse.json(orderWithShipping);
  } catch (error) {
    console.error("Error fetching admin order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const orderId = resolved.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = [
      "pending",
      "processing",
      "paid",
      "shipped",
      "delivered",
      "cancelled"
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } }
    });

    // Invalidate & warm stats cache asynchronously (order status change may affect ordersByStatus/revenue)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Failed to warm stats after admin order update:", msg, err);
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after admin order update:",
        e
      );
    }

    return NextResponse.json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Error updating admin order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
