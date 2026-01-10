import { describe, it, expect, vi } from "vitest";

// Mock tenant detection
vi.mock("@/lib/tenant", () => ({
  getTenantForHost: async (host: string) => ({
    id: "d1",
    name: "Chromet",
    logoUrl: null,
    brandColor: "#ff0000"
  })
}));

// Mock next-auth getServerSession to return an authenticated customer
vi.mock("next-auth", () => ({
  getServerSession: async () => ({ user: { id: "u1", role: "customer" } })
}));

// Mock prisma cart and product data
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findUnique: async () => ({
        id: "c1",
        userId: "u1",
        items: [
          {
            id: "ci1",
            cartId: "c1",
            productId: "p1",
            quantity: 1,
            product: { id: "p1", name: "Widget", price: 100, image: "/img.png" }
          }
        ]
      })
    },
    product: {
      findUnique: async ({ where }: any) =>
        where.id === "p1" ? { id: "p1", price: 100, category: "general" } : null
    },
    user: {
      findUnique: async ({ where }: any) => ({ id: where.id, role: "customer" })
    },
    distributorPrice: {
      findUnique: async ({ where }: any) =>
        where.productId_distributorId.productId === "p1"
          ? { customPrice: 80, discountTiers: null }
          : null
    }
  }
}));

import { GET } from "@/app/api/cart/route";

describe("Cart tenant pricing", () => {
  it("applies tenant pricing for authenticated customers on tenant host", async () => {
    const req = new Request("/", {
      headers: new Headers([["x-tenant-host", "chromet.example:3000"]])
    });

    const res = await GET(req as any);
    const data = await res.json();

    expect(data.items[0].price).toBe(80);
    expect(data.items[0].basePrice).toBe(100);
  });
});
