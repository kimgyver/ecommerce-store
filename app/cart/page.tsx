"use client";

import { useCart } from "@/lib/cart-context";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } =
    useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Shopping Cart</h1>
        <p className="text-gray-600 text-lg mb-8">Your cart is empty.</p>
        <Link
          href="/products"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const totalPrice = getTotalPrice();

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    // Payment processing will be handled here
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert("Order completed! Thank you!");
    clearCart();
    setIsCheckingOut(false);
    window.location.href = "/";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {items.map(item => (
              <div
                key={item.id}
                className="flex gap-4 p-6 border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                {/* Product image */}
                <div className="relative w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>

                {/* Product info */}
                <div className="flex-1">
                  <Link
                    href={`/products/${item.id}`}
                    className="text-lg font-semibold hover:text-blue-600"
                  >
                    {item.name}
                  </Link>
                  <p className="text-gray-600 mt-1">
                    ${item.price.toLocaleString("en-US")}
                  </p>

                  {/* Quantity control */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={async () => {
                        setLoadingItems(prev =>
                          new Set(prev).add(`${item.id}-minus`)
                        );
                        await updateQuantity(item.id, item.quantity - 1);
                        setLoadingItems(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(`${item.id}-minus`);
                          return newSet;
                        });
                      }}
                      disabled={loadingItems.has(`${item.id}-minus`)}
                      className={`w-10 h-10 rounded transition flex items-center justify-center font-semibold ${
                        loadingItems.has(`${item.id}-minus`)
                          ? "bg-blue-400 cursor-wait text-white opacity-60"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                      title={
                        loadingItems.has(`${item.id}-minus`)
                          ? "Processing..."
                          : "Decrease quantity"
                      }
                    >
                      −
                    </button>
                    <span className="px-3 font-semibold w-12 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={async () => {
                        setLoadingItems(prev =>
                          new Set(prev).add(`${item.id}-plus`)
                        );
                        await updateQuantity(item.id, item.quantity + 1);
                        setLoadingItems(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(`${item.id}-plus`);
                          return newSet;
                        });
                      }}
                      disabled={loadingItems.has(`${item.id}-plus`)}
                      className={`w-10 h-10 rounded transition flex items-center justify-center font-semibold ${
                        loadingItems.has(`${item.id}-plus`)
                          ? "bg-blue-400 cursor-wait text-white opacity-60"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                      title={
                        loadingItems.has(`${item.id}-plus`)
                          ? "Processing..."
                          : "Increase quantity"
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Subtotal and delete */}
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    ${(item.price * item.quantity).toLocaleString("en-US")}
                  </p>
                  <button
                    onClick={async () => {
                      setLoadingItems(prev =>
                        new Set(prev).add(`${item.id}-remove`)
                      );
                      await removeFromCart(item.id);
                      setLoadingItems(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(`${item.id}-remove`);
                        return newSet;
                      });
                    }}
                    disabled={loadingItems.has(`${item.id}-remove`)}
                    className={`mt-4 font-semibold transition ${
                      loadingItems.has(`${item.id}-remove`)
                        ? "text-gray-400 cursor-default"
                        : "text-red-600 hover:text-red-800"
                    }`}
                  >
                    {loadingItems.has(`${item.id}-remove`)
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Continue shopping */}
          <Link
            href="/products"
            className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 pb-4 border-b">
              <div className="flex justify-between">
                <span>Item Count</span>
                <span>
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${totalPrice.toLocaleString("en-US")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{totalPrice > 100 ? "Free" : "$3.00"}</span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold mt-4 mb-6">
              <span>Total</span>
              <span>
                $
                {(totalPrice + (totalPrice > 100 ? 0 : 3)).toLocaleString(
                  "en-US"
                )}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`w-full py-3 rounded-lg text-white font-bold text-lg transition ${
                isCheckingOut
                  ? "bg-gray-400 cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              }`}
            >
              {isCheckingOut ? "Processing..." : "Checkout"}
            </button>

            <button
              onClick={() => clearCart()}
              disabled={isCheckingOut}
              className={`w-full mt-3 py-2 border rounded-lg transition ${
                isCheckingOut
                  ? "border-gray-300 text-gray-400 cursor-default bg-gray-50"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {isCheckingOut ? "Processing..." : "Clear Cart"}
            </button>

            {totalPrice > 100 && (
              <p className="text-sm text-green-600 mt-4 bg-green-50 p-3 rounded">
                ✓ Free shipping on orders over $100!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
