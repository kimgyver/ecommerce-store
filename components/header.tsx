"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";

interface NavLinkProps {
  href: string;
  label: string;
  hasCount?: boolean;
  cartCount: number;
  isActive: (href: string) => boolean;
}

interface UserDropdownProps {
  session: Session;
  isActive: (href: string) => boolean;
  pathname: string;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/cart", label: "Cart", hasCount: true }
];

const dropdownLinks = [
  { href: "/profile", label: "Profile", icon: "user" as const },
  { href: "/orders", label: "Orders", icon: "orders" as const }
];

function NavLink({ href, label, hasCount, cartCount, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`transition-all duration-200 relative ${
        isActive(href)
          ? "text-blue-400 font-semibold scale-110"
          : "hover:text-blue-400 active:scale-95"
      }`}
    >
      {label}
      {hasCount && cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          {cartCount}
        </span>
      )}
    </Link>
  );
}

function UserDropdown({ session, isActive, pathname }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 transition text-sm"
      >
        <span>{session.user?.name}</span>
        <div className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          {Icons.chevron}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          {dropdownLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2 text-sm border-t border-gray-700 first:border-t-0 first:rounded-t-lg transition ${
                isActive(link.href)
                  ? "bg-blue-600 text-white font-semibold"
                  : "hover:bg-gray-700"
              }`}
            >
              {Icons[link.icon as keyof typeof Icons]}
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              handleSignOut();
              setIsOpen(false);
            }}
            disabled={isSigningOut}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-b-lg transition border-t border-gray-700 ${
              isSigningOut
                ? "bg-red-500 cursor-wait opacity-60 text-white"
                : "hover:bg-red-700 text-white"
            }`}
          >
            {Icons.logout}
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { items } = useCart();
  const { data: session } = useSession();
  const pathname = usePathname();
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold hover:text-blue-400 transition flex items-center gap-2"
        >
          {Icons.store}
          Store
        </Link>

        <div className="flex gap-6 items-center">
          {navLinks.map(link => (
            <NavLink
              key={link.href}
              {...link}
              isActive={isActive}
              cartCount={cartCount}
            />
          ))}

          {session ? (
            <UserDropdown
              session={session}
              isActive={isActive}
              pathname={pathname}
            />
          ) : (
            <div className="flex gap-2">
              <Link
                href="/auth/login"
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
