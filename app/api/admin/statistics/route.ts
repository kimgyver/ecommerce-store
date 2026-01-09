import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import statsCache from "@/lib/stats-cache";

export async function computeStatistics() {
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
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
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
      .filter(
        order =>
          new Date(order.createdAt).toISOString().split("T")[0] === dateStr
      )
      .reduce((sum, order) => sum + order.totalPrice, 0);

    dailyRevenue.push({ date: dateStr, revenue: dayRevenue });
  }

  // User statistics
  const totalUsers = await prisma.user.count();
  const usersByRole = {
    customer: await prisma.user.count({ where: { role: "customer" } }),
    distributor: await prisma.distributor.count(),
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
      where: { createdAt: { gte: date, lt: nextDate } }
    });
    dailyNewUsers.push({ date: dateStr, count });
  }

  // Quote metrics (add daily series and aging + 30-day rolling conversion)
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
    where: { status: "requested", createdAt: { lt: threeDays, gte: sevenDays } }
  });
  const aging8plus = await prisma.quoteRequest.count({
    where: { status: "requested", createdAt: { lt: sevenDays } }
  });

  // Daily quote requests and orders (last 30 days)
  const start30 = new Date();
  start30.setDate(start30.getDate() - 29);
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

  // 30-day rolling quote conversion
  const quoteTotalCount30 = await prisma.quoteRequest.count({
    where: { createdAt: { gte: start30 } }
  });
  const quoteOrderedCount30 = await prisma.quoteRequest.count({
    where: { status: "ordered", updatedAt: { gte: start30 } }
  });
  const quoteConversionRate30 =
    quoteTotalCount30 > 0 ? (quoteOrderedCount30 / quoteTotalCount30) * 100 : 0;

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    averageOrderValue,
    topProducts,
    ordersByStatus,
    dailyRevenue,
    totalUsers,
    usersByRole,
    dailyNewUsers,
    // quote metrics
    quoteTotalCount,
    quoteOrderedCount,
    quoteConversionRate,
    quoteAging: { "0-3": aging0to3, "4-7": aging4to7, "8+": aging8plus },
    dailyQuoteRequests,
    dailyQuoteOrders,
    quoteTotalCount30,
    quoteOrderedCount30,
    quoteConversionRate30
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when role field is added to User model

    // Delegate heavy computation to cached computeStatistics
    const result = await statsCache.getCachedStats(computeStatistics);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
