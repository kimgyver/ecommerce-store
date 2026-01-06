"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  basePrice?: number;
  product: {
    id: string;
    name: string;
    image: string;
  };
}

interface Order {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      loadOrders();
    }
  }, [status]);

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError("Failed to load orders");
      }
    } catch (err) {
      setError("An error occurred while loading orders");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (status === "loading" || isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Order History</h1>
        <p className="text-gray-600">View and track all your orders</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg mb-4">No orders yet</p>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-bold text-lg">
                    {order.id.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  {(() => {
                    const totalBasePrice = order.items.reduce((sum, item) => {
                      const basePrice = item.basePrice || item.price;
                      return sum + basePrice * item.quantity;
                    }, 0);
                    const hasDiscount = totalBasePrice > order.totalPrice;

                    return (
                      <>
                        {hasDiscount && (
                          <p className="text-sm text-gray-500 line-through">
                            ${totalBasePrice.toFixed(2)}
                          </p>
                        )}
                        <p
                          className={`text-2xl font-bold ${
                            hasDiscount ? "text-blue-600" : "text-gray-900"
                          }`}
                        >
                          ${order.totalPrice.toFixed(2)}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Order Items */}
              <div className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  Items ({order.items.length})
                </p>
                <div className="space-y-4">
                  {order.items.map(item => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      {/* Product Image */}
                      <div className="relative w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <Link
                          href={`/products/${item.product.id}`}
                          className="font-semibold hover:text-blue-600"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          Quantity: {item.quantity}
                        </p>
                        <div className="text-sm text-gray-600">
                          {item.basePrice && item.basePrice !== item.price ? (
                            <>
                              <span className="line-through mr-2">
                                Original: ${item.basePrice.toFixed(2)}
                              </span>
                              <span className="text-blue-600 font-semibold">
                                Price: ${item.price.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span>Price: ${item.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      {/* Item Subtotal */}
                      <div className="text-right">
                        {item.basePrice && item.basePrice !== item.price ? (
                          <>
                            <p className="text-sm text-gray-500 line-through">
                              ${(item.basePrice * item.quantity).toFixed(2)}
                            </p>
                            <p className="font-semibold text-blue-600">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  View Details →
                </Link>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition">
                  Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
