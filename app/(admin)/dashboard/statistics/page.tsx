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
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
