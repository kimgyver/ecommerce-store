"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "@/components/PaymentForm";

interface ShippingInfo {
  name: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
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
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "",
    phone: "",
    postalCode: "",
    address1: "",
    address2: ""
  });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "po">("stripe");
  const [isDistributor, setIsDistributor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/checkout`);
      return;
    }

    // Check if user is distributor
    if (status === "authenticated" && session?.user) {
      setIsDistributor(session.user.role === "distributor");
    }

    // After login: sync guest_cart to server if exists
    if (status === "authenticated") {
      const guestCart = localStorage.getItem("guest_cart");
      if (guestCart) {
        const items: CartItem[] = JSON.parse(guestCart);
        // Add each product to server
        Promise.all(
          items.map((item: CartItem) =>
            fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: item.id,
                quantity: item.quantity
              })
            })
          )
        ).then(() => {
          localStorage.removeItem("guest_cart");
          loadCartAndCreatePayment();
        });
      } else {
        loadCartAndCreatePayment();
      }

      // Shipping autofill: if alwaysUseProfileShipping is true, always use profile; otherwise use existing logic
      (async () => {
        try {
          // 1. Check profile alwaysUseProfileShipping value
          const profileRes = await fetch("/api/user/profile");
          let profile = null;
          if (profileRes.ok) {
            profile = await profileRes.json();
          }
          if (profile && profile.alwaysUseProfileShipping) {
            // Always use profile shipping address
            setShipping({
              name: profile.defaultRecipientName || "",
              phone: profile.defaultRecipientPhone || "",
              postalCode: profile.defaultShippingPostalCode || "",
              address1: profile.defaultShippingAddress1 || "",
              address2: profile.defaultShippingAddress2 || ""
            });
            return;
          }
          // 2. Existing logic: recent order → if none, use profile
          let shippingInfo: ShippingInfo | null = null;
          const orderRes = await fetch("/api/orders?limit=1");
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            if (
              Array.isArray(orderData) &&
              orderData.length > 0 &&
              orderData[0].shipping
            ) {
              shippingInfo = orderData[0].shipping;
            }
          }
          if (!shippingInfo && profile) {
            shippingInfo = {
              name: profile.defaultRecipientName || "",
              phone: profile.defaultRecipientPhone || "",
              postalCode: profile.defaultShippingPostalCode || "",
              address1: profile.defaultShippingAddress1 || "",
              address2: profile.defaultShippingAddress2 || ""
            };
          }
          if (
            shippingInfo &&
            (shippingInfo.name ||
              shippingInfo.phone ||
              shippingInfo.postalCode ||
              shippingInfo.address1)
          ) {
            setShipping(shippingInfo);
          }
        } catch (err) {
          // Ignore: if autofill fails, form remains with empty values
        }
      })();
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

      // Only create payment intent if Stripe is selected
      if (paymentMethod === "stripe") {
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

        if (!paymentData.clientSecret || !paymentData.paymentIntentId) {
          throw new Error("No client secret or paymentIntentId received");
        }

        setClientSecret(paymentData.clientSecret);
        setPaymentIntentId(paymentData.paymentIntentId);
      }
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

  if (paymentMethod === "stripe" && !clientSecret) {
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

            <div className="pt-4 space-y-3 border-t-2">
              {(() => {
                const totalBasePrice = cartItems.reduce((sum, item) => {
                  const basePrice = item.basePrice || item.price;
                  return sum + basePrice * item.quantity;
                }, 0);
                const hasDiscount = totalBasePrice > totalAmount;

                return (
                  <>
                    {hasDiscount && (
                      <div className="flex justify-between text-gray-500">
                        <span>Original Price:</span>
                        <span className="line-through">
                          ${totalBasePrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span
                        className={
                          hasDiscount ? "text-blue-600 font-semibold" : ""
                        }
                      >
                        ${totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}
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

          {/* Shipping Info Form */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Information</h3>
            <div className="space-y-3">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Name"
                value={shipping.name}
                onChange={e =>
                  setShipping(s => ({ ...s, name: e.target.value }))
                }
                required
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Phone"
                value={shipping.phone}
                onChange={e =>
                  setShipping(s => ({ ...s, phone: e.target.value }))
                }
                required
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Postal Code"
                value={shipping.postalCode}
                onChange={e =>
                  setShipping(s => ({ ...s, postalCode: e.target.value }))
                }
                required
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Address 1"
                value={shipping.address1}
                onChange={e =>
                  setShipping(s => ({ ...s, address1: e.target.value }))
                }
                required
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Address 2 (optional)"
                value={shipping.address2}
                onChange={e =>
                  setShipping(s => ({ ...s, address2: e.target.value }))
                }
              />
              <label className="flex items-center mt-2">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={saveAsDefault}
                  onChange={e => setSaveAsDefault(e.target.checked)}
                />
                <span>Use this shipping info as default for next time</span>
              </label>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Payment Details</h2>

          {/* Payment Method Selection for B2B */}
          {isDistributor && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === "stripe"}
                    onChange={e => {
                      setPaymentMethod(e.target.value as "stripe" | "po");
                      if (e.target.value === "stripe" && !clientSecret) {
                        loadCartAndCreatePayment();
                      }
                    }}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold">
                      💳 Pay Now (Credit Card)
                    </div>
                    <div className="text-sm text-gray-600">
                      Instant payment via Stripe
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="po"
                    checked={paymentMethod === "po"}
                    onChange={e =>
                      setPaymentMethod(e.target.value as "stripe" | "po")
                    }
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold">
                      📄 Purchase Order (Net 30)
                    </div>
                    <div className="text-sm text-gray-600">
                      Pay within 30 days from order date
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            {paymentMethod === "stripe" ? (
              clientSecret ? (
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
                    onSuccess={async () => {
                      setOrderError(null);
                      // Validate shipping info
                      if (
                        !shipping.name ||
                        !shipping.phone ||
                        !shipping.postalCode ||
                        !shipping.address1
                      ) {
                        setOrderError(
                          "Please fill in all required shipping fields."
                        );
                        return;
                      }
                      console.log("[Order API] Creating order...");
                      try {
                        const res = await fetch("/api/orders", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: cartItems.map(item => ({
                              productId: item.id,
                              quantity: item.quantity,
                              price: parseFloat(item.price.toFixed(2)),
                              basePrice: item.basePrice
                                ? parseFloat(item.basePrice.toFixed(2))
                                : undefined
                            })),
                            shipping,
                            paymentIntentId
                          })
                        });
                        console.log("[Order API] Response status:", res.status);
                        if (!res.ok) {
                          const err = await res.json();
                          console.error("[Order API Error]", err);
                          setOrderError(err.error || "Order creation failed");
                          return;
                        }
                        // On successful order, save as default shipping if 'Use this shipping info as default for next time' is checked
                        if (saveAsDefault) {
                          try {
                            await fetch("/api/user/profile", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                defaultRecipientName: shipping.name,
                                defaultRecipientPhone: shipping.phone,
                                defaultShippingPostalCode: shipping.postalCode,
                                defaultShippingAddress1: shipping.address1,
                                defaultShippingAddress2: shipping.address2
                              })
                            });
                          } catch (e) {
                            // Ignore: order continues even if saving shipping address fails
                          }
                        }
                        console.log(
                          "[Order API] Order created successfully, navigating to /checkout/success"
                        );
                        router.push(
                          `/checkout/success?payment_intent=${paymentIntentId}`
                        );
                      } catch (err) {
                        console.error("[Order API Exception]", err);
                        setOrderError("Order creation failed");
                      }
                    }}
                  />
                </Elements>
              ) : (
                <div className="text-center text-gray-500">
                  Initializing payment...
                </div>
              )
            ) : (
              /* PO Payment Method */
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Purchase Order Details
                </h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Terms:</span>
                    <span className="font-semibold">Net 30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Due:</span>
                    <span className="font-semibold">
                      {new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                    A Purchase Order will be generated and sent to your email.
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (isSubmitting) return; // Prevent double click

                    setOrderError(null);
                    // Validate shipping info
                    if (
                      !shipping.name ||
                      !shipping.phone ||
                      !shipping.postalCode ||
                      !shipping.address1
                    ) {
                      setOrderError(
                        "Please fill in all required shipping fields."
                      );
                      return;
                    }

                    setIsSubmitting(true);
                    console.log("[PO Order] Creating order...");
                    try {
                      const res = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: cartItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: parseFloat(item.price.toFixed(2)),
                            basePrice: item.basePrice
                              ? parseFloat(item.basePrice.toFixed(2))
                              : undefined
                          })),
                          shipping,
                          paymentMethod: "po"
                        })
                      });
                      console.log("[PO Order] Response status:", res.status);
                      if (!res.ok) {
                        const err = await res.json();
                        console.error("[PO Order Error]", err);
                        setOrderError(err.error || "Order creation failed");
                        setIsSubmitting(false);
                        return;
                      }
                      const orderData = await res.json();
                      if (saveAsDefault) {
                        try {
                          await fetch("/api/user/profile", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              defaultRecipientName: shipping.name,
                              defaultRecipientPhone: shipping.phone,
                              defaultShippingPostalCode: shipping.postalCode,
                              defaultShippingAddress1: shipping.address1,
                              defaultShippingAddress2: shipping.address2
                            })
                          });
                        } catch (e) {
                          // Ignore
                        }
                      }
                      console.log(
                        "[PO Order] Order created successfully, navigating to success"
                      );
                      router.push(
                        `/checkout/success?order_id=${orderData.order.id}`
                      );
                    } catch (err) {
                      console.error("[PO Order Exception]", err);
                      setOrderError("Order creation failed");
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-lg font-semibold ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white`}
                >
                  {isSubmitting ? "Processing..." : "Place Order (PO)"}
                </button>
              </div>
            )}
            {/* Error message UI: separate orderError and errorMessage to avoid displaying both simultaneously */}
            {orderError && !orderError.includes("Payment") && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-4">
                {orderError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
