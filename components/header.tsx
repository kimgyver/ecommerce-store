"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const { items } = useCart();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [clickedLink, setClickedLink] = useState<string | null>(null);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  const isActive = (href: string) => {
    // If a link was clicked, only activate that one
    if (clickedLink) {
      return clickedLink === href;
    }
    // If no link was clicked, use current path
    return pathname === href;
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  const handleLinkClick = (href: string) => {
    setClickedLink(href);
  };

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold hover:text-blue-400 transition"
        >
          🛍️ E-Commerce Store
        </Link>
        <div className="flex gap-6 items-center">
          <Link
            href="/"
            onClick={() => handleLinkClick("/")}
            className={`transition-all duration-200 ${
              isActive("/")
                ? "text-blue-400 font-semibold scale-110"
                : "hover:text-blue-400 active:scale-95"
            }`}
          >
            Home
          </Link>
          <Link
            href="/products"
            onClick={() => handleLinkClick("/products")}
            className={`transition-all duration-200 ${
              isActive("/products")
                ? "text-blue-400 font-semibold scale-110"
                : "hover:text-blue-400 active:scale-95"
            }`}
          >
            Products
          </Link>
          <Link
            href="/cart"
            onClick={() => handleLinkClick("/cart")}
            className={`transition-all duration-200 relative ${
              isActive("/cart")
                ? "text-blue-400 font-semibold scale-110"
                : "hover:text-blue-400 active:scale-95"
            }`}
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User authentication status */}
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">👋 {session.user?.name}</span>
              <Link
                href="/profile"
                onClick={() => handleLinkClick("/profile")}
                className={`px-3 py-1 rounded text-sm transition-all duration-200 ${
                  isActive("/profile")
                    ? "bg-blue-600 text-white font-semibold scale-110"
                    : "bg-gray-600 hover:bg-gray-700 active:scale-95"
                }`}
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`px-3 py-1 rounded text-sm transition ${
                  isSigningOut
                    ? "bg-red-500 cursor-wait opacity-60"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/auth/login"
                onClick={() => handleLinkClick("/auth/login")}
                className={`px-3 py-1 rounded text-sm transition-all duration-200 ${
                  isActive("/auth/login")
                    ? "bg-blue-700 text-white font-semibold scale-110"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => handleLinkClick("/auth/register")}
                className={`px-3 py-1 rounded text-sm transition-all duration-200 ${
                  isActive("/auth/register")
                    ? "bg-green-700 text-white font-semibold scale-110"
                    : "bg-green-600 hover:bg-green-700 active:scale-95"
                }`}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
