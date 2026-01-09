import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
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

    // Get pending quote requests count
    const pendingQuotes = await prisma.quoteRequest.count({
      where: { status: "requested" }
    });

    // Quote counts by status and conversion rate (use explicit counts for reliability)
    const quoteTotalCount = await prisma.quoteRequest.count();
    const quoteOrderedCount = await prisma.quoteRequest.count({
      where: { status: "ordered" }
    });
    const quoteConversionRate =
      quoteTotalCount > 0 ? (quoteOrderedCount / quoteTotalCount) * 100 : 0;

    // Quote aging for open requests (status=requested)
    const nowAging = new Date();
    const threeDays = new Date(nowAging);
    threeDays.setDate(nowAging.getDate() - 3);
    const sevenDays = new Date(nowAging);
    sevenDays.setDate(nowAging.getDate() - 7);
    const aging0to3 = await prisma.quoteRequest.count({
      where: { status: "requested", createdAt: { gte: threeDays } }
    });
    const aging4to7 = await prisma.quoteRequest.count({
      where: {
        status: "requested",
        createdAt: { lt: threeDays, gte: sevenDays }
      }
    });
    const aging8plus = await prisma.quoteRequest.count({
      where: { status: "requested", createdAt: { lt: sevenDays } }
    });

    // Low stock count (threshold: <=5)
    const lowStockCount = await prisma.product.count({
      where: { stock: { lte: 5 } }
    });

    // Orders by status (grouped)
    const ordersByStatusRaw = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true }
    });
    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersByStatusRaw) {
      ordersByStatus[row.status] = row._count?._all ?? 0;
    }

    // Average order value (safe)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products by revenue (aggregate order items)
    const orderItems = await prisma.orderItem.findMany({
      select: {
        productId: true,
        quantity: true,
        price: true,
        product: { select: { id: true, name: true, sku: true } }
      }
    });
    const productMap: Record<
      string,
      {
        id: string;
        name?: string | null;
        sku?: string | null;
        quantity: number;
        revenue: number;
      }
    > = {};
    for (const it of orderItems) {
      const r = (it.price || 0) * (it.quantity || 0);
      if (!productMap[it.productId]) {
        productMap[it.productId] = {
          id: it.productId,
          name: it.product?.name,
          sku: it.product?.sku,
          quantity: it.quantity || 0,
          revenue: r
        };
      } else {
        productMap[it.productId].quantity += it.quantity || 0;
        productMap[it.productId].revenue += r;
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name || "",
        totalSold: p.quantity,
        revenue: p.revenue
      }));

    // Top customers by revenue
    const customerAgg = await prisma.order.groupBy({
      by: ["userId"],
      _sum: { totalPrice: true }
    });
    const topCustomers = [] as Array<{
      userId: string;
      totalSpent: number;
      orders: number;
      email?: string | null;
      name?: string | null;
    }>;
    for (const c of customerAgg) {
      if (!c.userId) continue; // skip anonymous/null userIds
      const uid = c.userId;
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { email: true, name: true }
      });
      const ordersCount = await prisma.order.count({ where: { userId: uid } });
      topCustomers.push({
        userId: uid,
        totalSpent: c._sum.totalPrice ?? 0,
        orders: ordersCount,
        email: user?.email,
        name: user?.name
      });
    }
    topCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
    const topCustomersLimited = topCustomers.slice(0, 5);

    // Orders by payment method
    const ordersByPaymentRaw = await prisma.order.groupBy({
      by: ["paymentMethod"],
      _count: { _all: true }
    });
    const ordersByPayment: Record<string, number> = {};
    for (const r of ordersByPaymentRaw) {
      ordersByPayment[r.paymentMethod ?? "unknown"] = r._count?._all ?? 0;
    }

    // Daily revenue (last 30 days)
    const start30 = new Date();
    start30.setDate(start30.getDate() - 29);
    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: start30 } },
      select: { createdAt: true, totalPrice: true }
    });
    const dailyRevenueMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      dailyRevenueMap[key] = 0;
    }
    for (const o of recentOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      dailyRevenueMap[key] = (dailyRevenueMap[key] || 0) + (o.totalPrice || 0);
    }
    const dailyRevenue = Object.entries(dailyRevenueMap).map(
      ([date, revenue]) => ({ date, revenue })
    );

    // Daily quote requests and orders (last 30 days)
    const dailyQuoteRequestMap: Record<string, number> = {};
    const dailyQuoteOrderMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      dailyQuoteRequestMap[key] = 0;
      dailyQuoteOrderMap[key] = 0;
    }
    const recentQuotes = await prisma.quoteRequest.findMany({
      where: {
        OR: [{ createdAt: { gte: start30 } }, { updatedAt: { gte: start30 } }]
      },
      select: { createdAt: true, updatedAt: true, status: true }
    });
    for (const q of recentQuotes) {
      const createdKey = q.createdAt.toISOString().slice(0, 10);
      if (dailyQuoteRequestMap[createdKey] !== undefined)
        dailyQuoteRequestMap[createdKey]++;
      if (q.status === "ordered" && q.updatedAt) {
        const updatedKey = q.updatedAt.toISOString().slice(0, 10);
        if (dailyQuoteOrderMap[updatedKey] !== undefined)
          dailyQuoteOrderMap[updatedKey]++;
      }
    }
    const dailyQuoteRequests = Object.entries(dailyQuoteRequestMap).map(
      ([date, count]) => ({ date, count })
    );
    const dailyQuoteOrders = Object.entries(dailyQuoteOrderMap).map(
      ([date, count]) => ({ date, count })
    );

    // 30-day rolling quote conversion (requests created in last 30 days -> orders placed in last 30 days)
    const quoteTotalCount30 = await prisma.quoteRequest.count({
      where: { createdAt: { gte: start30 } }
    });
    const quoteOrderedCount30 = await prisma.quoteRequest.count({
      where: { status: "ordered", updatedAt: { gte: start30 } }
    });
    const quoteConversionRate30 =
      quoteTotalCount30 > 0
        ? (quoteOrderedCount30 / quoteTotalCount30) * 100
        : 0;

    // Daily new users (last 7 days)
    const start7 = new Date();
    start7.setDate(start7.getDate() - 6);
    const newUsers = await prisma.user.findMany({
      where: { createdAt: { gte: start7 } },
      select: { createdAt: true }
    });
    const dailyNewUsersMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      dailyNewUsersMap[key] = 0;
    }
    for (const u of newUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      dailyNewUsersMap[key] = (dailyNewUsersMap[key] || 0) + 1;
    }
    const dailyNewUsers = Object.entries(dailyNewUsersMap).map(
      ([date, count]) => ({ date, count })
    );

    // Get user statistics
    const totalUsers = await prisma.user.count();
    const customerCount = await prisma.user.count({
      where: { role: "customer" }
    });
    const distributorCount = await prisma.distributor.count();
    const adminCount = await prisma.user.count({
      where: { role: "admin" }
    });

    // Get new users this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      }
    });

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      pendingOrders,
      pendingQuotes,
      lowStockCount,
      ordersByStatus,
      topProducts,
      dailyRevenue,
      totalUsers,
      customerCount,
      distributorCount,
      adminCount,
      dailyNewUsers,
      newUsersThisMonth,
      // quote metrics
      // kept for backward compatibility: include counts and rate
      quoteTotalCount,
      quoteOrderedCount,
      quoteConversionRate,
      quoteAging: { "0-3": aging0to3, "4-7": aging4to7, "8+": aging8plus },
      // 30-day rolling metrics
      quoteTotalCount30,
      quoteOrderedCount30,
      quoteConversionRate30,
      dailyQuoteRequests,
      dailyQuoteOrders,
      // customers & payments
      topCustomers: topCustomersLimited,
      ordersByPayment
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
