"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "@/components/PaymentForm";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      loadCartAndCreatePayment();
    }
  }, [status]);

  const loadCartAndCreatePayment = async () => {
    try {
      // Fetch cart
      const cartRes = await fetch("/api/cart");
      if (!cartRes.ok) {
        const error = await cartRes.text();
        throw new Error(`Failed to fetch cart: ${error}`);
      }

      const cartData = await cartRes.json();

      if (!cartData.items || cartData.items.length === 0) {
        throw new Error("Cart is empty");
      }

      setCartItems(cartData.items);

      const total = cartData.items.reduce(
        (sum: number, item: CartItem) => sum + item.price * item.quantity,
        0
      );
      setTotalAmount(total);

      // Create payment intent
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartData.items,
          totalAmount: total
        })
      });

      if (!paymentRes.ok) {
        const error = await paymentRes.text();
        throw new Error(`Failed to create payment: ${error}`);
      }

      const paymentData = await paymentRes.json();

      if (!paymentData.clientSecret) {
        throw new Error("No client secret received");
      }

      setClientSecret(paymentData.clientSecret);
    } catch (error) {
      console.error("Error loading checkout:", error);
      alert(
        `Checkout failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      router.push("/cart");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!clientSecret) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to initialize payment. Redirecting to cart...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            {cartItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex justify-between items-start pb-4 ${
                  index !== cartItems.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}

            <div className="pt-4 space-y-3 border-t-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t">
                <span>Total:</span>
                <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe"
                }
              }}
            >
              <PaymentForm
                totalAmount={totalAmount}
                onSuccess={() => {
                  router.push("/checkout/success");
                }}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}
