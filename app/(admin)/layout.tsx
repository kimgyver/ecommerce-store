"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated (TODO: Add admin role check when available)
  if (status !== "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </p>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access the admin dashboard.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {isSidebarOpen && <h1 className="text-xl font-bold">Admin</h1>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded transition"
          >
            {Icons.menu}
          </button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-auto">
          <NavLink
            href="/dashboard"
            icon={Icons.dashboard}
            label="Dashboard"
            isOpen={isSidebarOpen}
          />
          <NavLink
            href="/dashboard/products"
            icon={Icons.products}
            label="Products"
            isOpen={isSidebarOpen}
          />
          <NavLink
            href="/dashboard/orders"
            icon={Icons.orders}
            label="Orders"
            isOpen={isSidebarOpen}
          />
          <NavLink
            href="/dashboard/statistics"
            icon={Icons.statistics}
            label="Statistics"
            isOpen={isSidebarOpen}
          />
        </nav>

        {/* User info at bottom */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="text-white font-semibold truncate">
              {session?.user?.email}
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  isOpen
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white"
      title={!isOpen ? label : undefined}
    >
      {icon}
      {isOpen && <span>{label}</span>}
    </Link>
  );
}
