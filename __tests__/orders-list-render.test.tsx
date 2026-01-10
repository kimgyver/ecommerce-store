import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock session as authenticated customer
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", role: "customer" } },
    status: "authenticated"
  })
}));

// Mock next/navigation push to avoid actual routing
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import OrdersPage from "@/app/orders/page";

describe("Orders list rendering", () => {
  const order = {
    id: "o1",
    totalPrice: 80,
    status: "pending",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: "oi1",
        quantity: 1,
        price: 80,
        basePrice: 100,
        product: { id: "p1", name: "Widget", image: "/img.png" }
      }
    ]
  };

  beforeEach(() => {
    // Mock fetch for /api/orders
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo) => {
        if (String(input).includes("/api/orders")) {
          return Promise.resolve({
            ok: true,
            json: async () => [order]
          } as any);
        }
        return Promise.resolve({ ok: false } as any);
      })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows original (strike-through) and discounted totals in orders list", async () => {
    render(<OrdersPage />);

    // Wait for totals to appear
    expect(await screen.findByText("Order History")).toBeTruthy();

    // Original total (strike-through) should be present (may appear multiple times)
    const originals = await screen.findAllByText("$100.00");
    const discounteds = await screen.findAllByText("$80.00");

    expect(originals.length).toBeGreaterThan(0);
    expect(discounteds.length).toBeGreaterThan(0);

    // At least one original price element should include a line-through class
    expect(originals.some(el => el.className.includes("line-through"))).toBe(
      true
    );

    // At least one discounted element should be the order-level (large font)
    expect(discounteds.some(el => el.className.includes("text-2xl"))).toBe(
      true
    );
  });
});
