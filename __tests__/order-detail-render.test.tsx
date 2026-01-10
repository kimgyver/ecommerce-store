import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock session as authenticated customer
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", role: "customer" } },
    status: "authenticated"
  })
}));

// Mock next/navigation to provide params and router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: "o1" })
}));

import OrderDetailPage from "@/app/orders/[id]/page";

describe("Order detail rendering", () => {
  const order = {
    id: "o1",
    totalPrice: 80,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "oi1",
        quantity: 2,
        price: 40,
        basePrice: 50,
        product: { id: "p1", name: "Widget", image: "/img.png", price: 50 }
      }
    ]
  };

  beforeEach(() => {
    // Mock fetch for /api/orders/o1
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo) => {
        if (String(input).includes("/api/orders/o1")) {
          return Promise.resolve({ ok: true, json: async () => order } as any);
        }
        return Promise.resolve({ ok: false } as any);
      })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows original per-item price (strike-through) and discounted price in order detail", async () => {
    render(<OrderDetailPage />);

    // Product name should appear
    expect(await screen.findByText("Widget")).toBeTruthy();

    // Original per-item price (50.00) and discounted (40.00)
    const original = await screen.findByText("$50.00");
    const discounted = await screen.findByText("$40.00");

    expect(original).toBeTruthy();
    expect(discounted).toBeTruthy();

    // original price should be struck through
    expect(original.className.includes("line-through")).toBe(true);
  });
});
