"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  productId: string;
  product: {
    name: string;
    price: number;
  };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter(order => order.status === filterStatus);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setOrders(
          orders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      }
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order status");
    }
  };

  const statuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Orders</h1>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status:
        </label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Orders</option>
          {statuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {order.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${order.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Items:</p>
                <ul className="space-y-1">
                  {order.items.map(item => (
                    <li key={item.id} className="text-sm text-gray-700">
                      {item.product.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    order.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : order.status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : order.status === "shipped"
                      ? "bg-purple-100 text-purple-800"
                      : order.status === "delivered"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
