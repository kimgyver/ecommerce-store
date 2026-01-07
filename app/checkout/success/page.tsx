"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";

interface OrderItem {
  id: string;
  product: {
    name: string;
    price: number;
  };
  price: number;
  quantity: number;
}

interface OrderDetails {
  id: string;
  status: string;
  totalPrice: number;
  items: OrderItem[];
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const [paymentStatus, setPaymentStatus] = useState("loading");
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const processedRef = useRef(false);
  const { clearCart } = useCart();

  useEffect(() => {
    // Only run once - useRef persists across component remounts and page refreshes
    if (processedRef.current) return;
    processedRef.current = true;

    const completeCheckout = async () => {
      try {
        if (!paymentIntentId) {
          setPaymentStatus("error");
          return;
        }

        // Call webhook to create order
        // The webhook is idempotent - same paymentIntentId returns existing order
        const response = await fetch("/api/webhooks/payment-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
          // Disable caching to ensure fresh request
          cache: "no-store"
        });

        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data.order);
          setPaymentStatus("success");

          // Clear cart context after successful order
          try {
            await clearCart();
            // Clear guest cart as well
            localStorage.removeItem("guest_cart");
          } catch (error) {
            console.error("Failed to clear cart context:", error);
            // Don't fail the checkout even if cart clear fails
          }
        } else {
          const errorData = await response.json();
          console.error("Webhook error:", errorData);
          setPaymentStatus("error");
        }
      } catch (error) {
        console.error("Error completing checkout:", error);
        setPaymentStatus("error");
      }
    };

    completeCheckout();
  }, [paymentIntentId, clearCart]);

  if (paymentStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg font-semibold">Processing your order...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Payment Failed</h1>
          <p className="text-gray-600 mb-6">
            There was an issue processing your payment. Please try again.
          </p>
          <Link
            href="/cart"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-green-50 border-b-4 border-green-500 px-6 py-8 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h1 className="text-4xl font-bold text-green-700 mb-2">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600">Thank you for your order!</p>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="px-6 py-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order ID</p>
                  <p className="text-lg font-bold font-mono">
                    {orderDetails.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {orderDetails.status}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Items Ordered</p>
                <div className="space-y-2">
                  {orderDetails.items?.map((item: OrderItem) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.product.name} x {item.quantity}
                      </span>
                      <span className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid:</span>
                  <span className="text-blue-600">
                    ${orderDetails.totalPrice?.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-900">
                  A confirmation email has been sent to your email address. You
                  can track your order status in your profile.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 flex gap-4">
            <Link
              href="/orders"
              className="flex-1 px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View Orders
            </Link>
            <Link
              href="/products"
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
