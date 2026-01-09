"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";

interface StatisticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
  }>;
  ordersByStatus: Record<string, number>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
  }>;
  dailyQuoteRequests?: Array<{ date: string; count: number }>;
  dailyQuoteOrders?: Array<{ date: string; count: number }>;
  totalUsers: number;
  usersByRole: {
    customer: number;
    distributor: number;
    admin: number;
  };
  dailyNewUsers: Array<{
    date: string;
    count: number;
  }>;
  // added fields
  quoteCounts?: Record<string, number>;
  quoteConversionRate?: number;
  quoteTotalCount?: number;
  quoteOrderedCount?: number;
  // 30-day rolling
  quoteTotalCount30?: number;
  quoteOrderedCount30?: number;
  quoteConversionRate30?: number;
  quoteAging?: { "0-3"?: number; "4-7"?: number; "8+"?: number };
  topCustomers?: Array<{
    userId: string;
    totalSpent: number;
    orders: number;
    email?: string | null;
    name?: string | null;
  }>;
  ordersByPayment?: Record<string, number>;
}

// Function to change the favicon
function changeFavicon(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="white"/>
    <text x="50" y="80" font-size="80" text-anchor="middle" font-family="Arial, sans-serif">${emoji}</text>
  </svg>`;

  const dataUrl = "data:image/svg+xml," + encodeURIComponent(svg);
  let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = dataUrl;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [hoveredQuoteIndex, setHoveredQuoteIndex] = useState<number | null>(
    null
  );
  const [recentQuotes, setRecentQuotes] = useState<
    Array<{
      id: string;
      createdAt: string;
      quantity?: number | null;
      status: string;
      product?: { name: string; sku?: string } | null;
      requester?: { email: string; name?: string } | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Update page title

    // Change favicon
    changeFavicon("⚙️");

    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/statistics");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
      // Fetch recent quotes (last 10)
      try {
        const qres = await fetch("/api/admin/quotes");
        if (qres.ok) {
          const qdata = await qres.json();
          setRecentQuotes(
            (qdata || []).slice(0, 10).map((q: any) => ({
              id: q.id,
              createdAt: q.createdAt,
              quantity: q.quantity,
              status: q.status,
              product: q.product,
              requester: q.requester
            }))
          );
        }
      } catch (e) {
        console.error("Failed to fetch recent quotes:", e);
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Statistics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`}
          icon={Icons.dollar}
          color="bg-green-500"
        />
        <MetricCard
          title="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={Icons.shoppingCart}
          color="bg-blue-500"
        />
        <MetricCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={Icons.listLarge}
          color="bg-purple-500"
        />
        <MetricCard
          title="Avg Order Value"
          value={`$${(stats?.averageOrderValue ?? 0).toFixed(2)}`}
          icon={Icons.trending}
          color="bg-orange-500"
        />
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">
          Daily Revenue (Last 30 days)
        </h2>
        {stats?.dailyRevenue && stats.dailyRevenue.length > 0 ? (
          <div className="w-full" style={{ height: 160 }}>
            <svg viewBox="0 0 600 160" className="w-full h-full">
              {/* compute points */}
              {(() => {
                const data = stats.dailyRevenue;
                const max = Math.max(...data.map(d => d.revenue), 1);
                const stepX = 600 / Math.max(1, data.length - 1);
                const points = data
                  .map((d, i) => {
                    const x = i * stepX;
                    const y = 140 - (d.revenue / max) * 120;
                    return `${x},${y}`;
                  })
                  .join(" ");
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      points={points}
                    />
                    {data.map((d, i) => {
                      const x = i * stepX;
                      const y = 140 - (d.revenue / max) * 120;
                      return (
                        <circle key={i} cx={x} cy={y} r={2} fill="#4F46E5" />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        ) : (
          <p className="text-gray-500">No revenue data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Top Products</h2>
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.totalSold} sold
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">
                    ${product.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        {/* Quotes Conversion & Aging */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">
            Quotes — Conversion & Aging
          </h2>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Last 30 days</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const ordered = stats?.quoteOrderedCount30 ?? 0;
                    const total = stats?.quoteTotalCount30 ?? 0;
                    const pct = total > 0 ? (ordered / total) * 100 : 0;
                    return `${pct.toFixed(1)}%`;
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.quoteOrderedCount30 ?? 0} ordered /{" "}
                  {stats?.quoteTotalCount30 ?? 0} total
                </p>
                {/* fallback: show all-time conversion below */}
                <p className="text-xs text-gray-400 mt-1">
                  All-time: {(stats?.quoteConversionRate ?? 0).toFixed(1)}% (
                  {stats?.quoteOrderedCount ?? 0}/{stats?.quoteTotalCount ?? 0})
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Overall conversion of requested → ordered
              </div>
            </div>

            {/* Conversion graph: daily quote requests (blue) + daily quote orders (green) */}
            {stats?.dailyQuoteRequests && (
              <div className="relative w-full my-2" style={{ height: 120 }}>
                <svg viewBox="0 0 600 120" className="w-full h-full">
                  {(() => {
                    const req = stats.dailyQuoteRequests;
                    const ord = stats.dailyQuoteOrders || [];
                    const max = Math.max(...req.map(d => d.count), 1);
                    const stepX = 600 / Math.max(1, req.length - 1);
                    const reqPoints = req.map(
                      (d, i) => `${i * stepX},${100 - (d.count / max) * 80}`
                    );
                    const ordPoints = ord.map(
                      (d, i) =>
                        `${i * stepX},${
                          100 - (d.count / Math.max(1, max)) * 80
                        }`
                    );
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth={2}
                          points={reqPoints.join(" ")}
                        />
                        <polyline
                          fill="none"
                          stroke="#10B981"
                          strokeWidth={2}
                          points={ordPoints.join(" ")}
                        />
                        {req.map((d, i) => {
                          const x = i * stepX;
                          const y = 100 - (d.count / max) * 80;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={3}
                              fill="#4F46E5"
                              onMouseEnter={() => setHoveredQuoteIndex(i)}
                              onMouseLeave={() => setHoveredQuoteIndex(null)}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                {/* tooltip area (absolute bottom-right to avoid overlapping legend) */}
                <div className="absolute right-2 bottom-2 text-sm text-gray-700 bg-white/80 px-2 py-1 rounded shadow-sm">
                  {hoveredQuoteIndex != null ? (
                    (() => {
                      const d = stats.dailyQuoteRequests[hoveredQuoteIndex];
                      const ord =
                        stats.dailyQuoteOrders?.[hoveredQuoteIndex]?.count ?? 0;
                      return (
                        <div>
                          {new Date(d.date).toLocaleDateString()}: {d.count}{" "}
                          requests · {ord} orders
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-gray-500">
                      Hover dots to see day details
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-sm text-gray-600">0-3 days</p>
                <p className="font-semibold">
                  {stats?.quoteAging?.["0-3"] ?? 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">4-7 days</p>
                <p className="font-semibold">
                  {stats?.quoteAging?.["4-7"] ?? 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">8+ days</p>
                <p className="font-semibold">
                  {stats?.quoteAging?.["8+"] ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders by Payment Method & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">
              Orders by Payment Method
            </h2>
            {stats?.ordersByPayment ? (
              <div className="space-y-2">
                {Object.entries(stats.ordersByPayment).map(([pm, count]) => (
                  <div key={pm} className="flex justify-between">
                    <span className="capitalize text-gray-700">{pm}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Top Customers</h2>
            {stats?.topCustomers && stats.topCustomers.length > 0 ? (
              <div className="space-y-3">
                {stats.topCustomers.map(c => (
                  <div
                    key={c.userId}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {c.name ?? c.email ?? c.userId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.email ?? ""} · {c.orders} orders
                      </div>
                    </div>
                    <div className="font-bold">
                      ${(c.totalSpent ?? 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Orders by Status</h2>
          {stats?.ordersByStatus ? (
            <div className="space-y-4">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-700">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className="font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === "pending"
                          ? "bg-yellow-500"
                          : status === "processing"
                          ? "bg-blue-500"
                          : status === "shipped"
                          ? "bg-purple-500"
                          : status === "delivered"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${(count / (stats?.totalOrders || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        {/* User Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">User Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Users</span>
              <span className="text-2xl font-bold text-indigo-600">
                {stats?.totalUsers ?? 0}
              </span>
            </div>
            {stats?.usersByRole && (
              <>
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-gray-700">Customers</span>
                  <span className="text-xl font-semibold text-green-600">
                    {stats.usersByRole.customer}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Distributors</span>
                  <span className="text-xl font-semibold text-blue-600">
                    {stats.usersByRole.distributor}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Admins</span>
                  <span className="text-xl font-semibold text-red-600">
                    {stats.usersByRole.admin}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* New Users Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">New Users (Last 7 Days)</h2>
          {stats?.dailyNewUsers && stats.dailyNewUsers.length > 0 ? (
            <div className="space-y-2">
              {stats.dailyNewUsers.map(day => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-24">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-teal-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(
                          (day.count /
                            Math.max(
                              ...stats.dailyNewUsers.map(d => d.count),
                              1
                            )) *
                            100,
                          5
                        )}%`
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {day.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        {/* Recent Quote Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Recent Quote Requests</h2>
          {recentQuotes.length > 0 ? (
            <div className="space-y-3">
              {recentQuotes.map(q => (
                <div key={q.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      {new Date(q.createdAt).toLocaleString()}
                    </div>
                    <div className="font-semibold">
                      {q.product?.sku ? `${q.product.sku} - ` : ""}
                      {q.product?.name || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Qty: {q.quantity ?? "-"} · {q.requester?.email || "-"}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="px-2 py-1 rounded text-sm bg-gray-100">
                      {q.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent quote requests</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`${color} rounded-lg shadow p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-white opacity-50">{icon}</div>
      </div>
    </div>
  );
}
