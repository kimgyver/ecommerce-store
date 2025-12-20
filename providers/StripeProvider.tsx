"use client";

import { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function StripeWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
