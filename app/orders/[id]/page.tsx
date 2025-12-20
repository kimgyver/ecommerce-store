"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
}

interface Order {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated" && orderId) {
      loadOrder();
    }
  }, [status, orderId, router]);

  const loadOrder = async () => {
    try {
      if (!orderId) {
        setError("No order ID provided");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 404) {
        setError("Order not found");
      } else {
        const errorText = await response.text();
        setError(`Failed to load order: ${errorText}`);
      }
    } catch (err) {
      setError("An error occurred while loading order");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your order has been placed and is awaiting processing.";
      case "processing":
        return "Your order is being prepared for shipment.";
      case "shipped":
        return "Your order has been shipped and is on its way.";
      case "delivered":
        return "Your order has been delivered. Thank you for your purchase!";
      case "cancelled":
        return "This order has been cancelled.";
      default:
        return "Order status unknown.";
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

  if (status === "unauthenticated" || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <Link
          href="/orders"
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/orders"
          className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block"
        >
          ← Back to Orders
        </Link>
        <h1 className="text-4xl font-bold">Order Details</h1>
        <p className="text-gray-600 mt-2">Order ID: {order.id}</p>
      </div>

      {/* Status Section */}
      <div
        className={`rounded-lg border-2 p-6 mb-8 ${getStatusColor(
          order.status
        )}`}
      >
        <h2 className="text-2xl font-bold mb-2">
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </h2>
        <p>{getStatusMessage(order.status)}</p>
      </div>

      {/* Order Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Order Date</p>
          <p className="font-semibold">{formatDate(order.createdAt)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Last Updated</p>
          <p className="font-semibold">{formatDate(order.updatedAt)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Items</p>
          <p className="font-semibold text-lg">{order.items.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="font-bold text-lg text-blue-600">
            $
            {order.totalPrice.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Items Ordered</h2>
        </div>
        <div className="divide-y">
          {order.items.map(item => (
            <div key={item.id} className="px-6 py-4 flex gap-6">
              {/* Product Image */}
              <div className="relative w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  fill
                  className="object-cover rounded"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1">
                <Link
                  href={`/products/${item.product.id}`}
                  className="text-lg font-semibold hover:text-blue-600"
                >
                  {item.product.name}
                </Link>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-semibold">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Price per Item</p>
                    <p className="font-semibold">
                      $
                      {item.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right">
                <p className="text-gray-600 text-sm mb-1">Subtotal</p>
                <p className="text-2xl font-bold text-blue-600">
                  $
                  {(item.price * item.quantity).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Total */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <p className="text-lg font-bold">Order Total:</p>
          <p className="text-3xl font-bold text-blue-600">
            $
            {order.totalPrice.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
          Download Invoice
        </button>
        <button className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold">
          Contact Support
        </button>
      </div>

      {/* Navigation */}
      <Link
        href="/orders"
        className="text-blue-600 hover:text-blue-700 font-semibold"
      >
        ← Back to All Orders
      </Link>
    </div>
  );
}
