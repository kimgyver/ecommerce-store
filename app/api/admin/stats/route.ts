import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when role field is added to User model

    // Get total products
    const totalProducts = await prisma.product.count();

    // Get total orders
    const totalOrders = await prisma.order.count();

    // Get total revenue
    const orders = await prisma.order.findMany({
      select: { totalPrice: true }
    });
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );

    // Get pending orders count
    const pendingOrders = await prisma.order.count({
      where: { status: "pending" }
    });

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
