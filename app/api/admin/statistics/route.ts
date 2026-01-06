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

    // Get all orders with items
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Calculate statistics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get total products
    const totalProducts = await prisma.product.count();

    // Calculate top products
    const productSales: Record<
      string,
      { name: string; totalSold: number; revenue: number }
    > = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.product.name,
            totalSold: 0,
            revenue: 0
          };
        }
        productSales[item.productId].totalSold += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Orders by status
    const ordersByStatus = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(order => {
      if (ordersByStatus.hasOwnProperty(order.status)) {
        ordersByStatus[order.status as keyof typeof ordersByStatus]++;
      }
    });

    // Daily revenue (last 7 days)
    const today = new Date();
    const dailyRevenue: { date: string; revenue: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayRevenue = orders
        .filter(order => {
          const orderDate = new Date(order.createdAt)
            .toISOString()
            .split("T")[0];
          return orderDate === dateStr;
        })
        .reduce((sum, order) => sum + order.totalPrice, 0);

      dailyRevenue.push({
        date: dateStr,
        revenue: dayRevenue
      });
    }

    // User statistics
    const totalUsers = await prisma.user.count();
    const usersByRole = {
      customer: await prisma.user.count({ where: { role: "customer" } }),
      distributor: await prisma.user.count({ where: { role: "distributor" } }),
      admin: await prisma.user.count({ where: { role: "admin" } })
    };

    // New users last 7 days
    const dailyNewUsers: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      dailyNewUsers.push({ date: dateStr, count });
    }

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      averageOrderValue,
      topProducts,
      ordersByStatus,
      dailyRevenue,
      totalUsers,
      usersByRole,
      dailyNewUsers
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
