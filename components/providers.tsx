"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "./header";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide header on admin pages
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <AuthProvider>
      <CartProvider>
        {!isAdminPage && <Header />}
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
