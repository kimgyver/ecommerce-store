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
  basePrice?: number;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
}

interface ShippingInfo {
  name: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2?: string;
}

interface Order {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shipping?: ShippingInfo;
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

      {/* Order Info Grid - horizontal layout */}
      <div className="bg-white rounded-lg shadow p-4 mb-8 flex flex-col gap-2 md:flex-row md:gap-6 md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 font-medium">Order Date:</span>
          <span className="font-semibold">{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 font-medium">Last Updated:</span>
          <span className="font-semibold">{formatDate(order.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 font-medium">Items:</span>
          <span className="font-semibold">{order.items.length}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <span className="text-gray-600 font-medium">Total Amount:</span>
          {(() => {
            const totalBasePrice = order.items.reduce((sum, item) => {
              const basePrice = item.basePrice || item.price;
              return sum + basePrice * item.quantity;
            }, 0);
            const hasDiscount = totalBasePrice > order.totalPrice;

            return (
              <>
                {hasDiscount && (
                  <span className="text-sm text-gray-500 line-through">
                    ${totalBasePrice.toFixed(2)}
                  </span>
                )}
                <span
                  className={`font-bold text-lg ${
                    hasDiscount ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  ${order.totalPrice.toFixed(2)}
                </span>
              </>
            );
          })()}
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
                    {item.basePrice && item.basePrice !== item.price ? (
                      <>
                        <p className="text-sm text-gray-500 line-through">
                          ${item.basePrice.toFixed(2)}
                        </p>
                        <p className="font-semibold text-blue-600">
                          ${item.price.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right">
                <p className="text-gray-600 text-sm mb-1">Subtotal</p>
                {item.basePrice && item.basePrice !== item.price ? (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      ${(item.basePrice * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order Total */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <p className="text-lg font-bold">Order Total:</p>
          {(() => {
            const totalBasePrice = order.items.reduce((sum, item) => {
              const basePrice = item.basePrice || item.price;
              return sum + basePrice * item.quantity;
            }, 0);
            const hasDiscount = totalBasePrice > order.totalPrice;

            return (
              <div className="text-right">
                {hasDiscount && (
                  <p className="text-lg text-gray-500 line-through">
                    ${totalBasePrice.toFixed(2)}
                  </p>
                )}
                <p
                  className={`text-3xl font-bold ${
                    hasDiscount ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  ${order.totalPrice.toFixed(2)}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Shipping Info - separate card */}
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <p className="text-sm text-gray-600 mb-2 font-bold">Shipping Info</p>
        {order.shipping ? (
          <div className="text-sm space-y-1">
            <div>
              <span className="font-semibold">Recipient:</span>{" "}
              {order.shipping.name}
            </div>
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.shipping.phone}
            </div>
            <div>
              <span className="font-semibold">Postal Code:</span>{" "}
              {order.shipping.postalCode}
            </div>
            <div>
              <span className="font-semibold">Address 1:</span>{" "}
              {order.shipping.address1}
            </div>
            {order.shipping.address2 && (
              <div>
                <span className="font-semibold">Address 2:</span>{" "}
                {order.shipping.address2}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400">No shipping info</div>
        )}
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
