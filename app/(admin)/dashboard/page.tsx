"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={Icons.listLarge}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={Icons.shoppingCart}
          color="bg-green-500"
        />
        <StatCard
          title="Total Revenue"
          value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`}
          icon={Icons.dollar}
          color="bg-purple-500"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders ?? 0}
          icon={Icons.clock}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionButton
            href="/dashboard/products"
            label="Add Product"
            icon={Icons.plus}
          />
          <ActionButton
            href="/dashboard/products"
            label="Manage Products"
            icon={Icons.documentDuplicate}
          />
          <ActionButton
            href="/dashboard/orders"
            label="View Orders"
            icon={Icons.listLarge}
          />
          <ActionButton
            href="/dashboard/statistics"
            label="View Statistics"
            icon={Icons.trending}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
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

function ActionButton({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-center flex flex-col items-center"
    >
      <div className="text-blue-600 mb-2">{icon}</div>
      <p className="font-semibold text-gray-800">{label}</p>
    </Link>
  );
}
