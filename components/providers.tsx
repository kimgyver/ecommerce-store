"use client";

import { ReactNode, useEffect, useState } from "react";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "./header";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <Header />
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
