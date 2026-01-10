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

// Mock next-auth getServerSession to return a logged-in customer
vi.mock("next-auth", () => ({
  getServerSession: async () => ({ user: { id: "u1", role: "customer" } })
}));

// Mock prisma product and distributorPrice lookup
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: async ({ where }: any) =>
        where.id === "p1"
          ? { id: "p1", sku: "W-1", name: "Widget", price: 100 }
          : null
    },
    distributorPrice: {
      findUnique: async ({ where }: any) =>
        where.productId_distributorId.productId === "p1"
          ? { customPrice: 80, discountTiers: null }
          : null
    },
    user: {
      findUnique: async ({ where }: any) => ({ id: where.id, role: "customer" })
    }
  }
}));

import { GET } from "@/app/api/products/[id]/route";

describe("Product detail tenant pricing (authenticated customer)", () => {
  it("returns tenant discounted price even for authenticated customers on tenant host", async () => {
    const req = new Request("/", {
      headers: new Headers([["x-tenant-host", "chromet.example:3000"]])
    });

    const res = await GET(req as any, { params: { id: "p1" } } as any);
    const data = await res.json();

    expect(data.price).toBe(80);
    expect(data.basePrice).toBe(100);
    expect(data.discountTiers).toMatchObject({ customPrice: 80 });
  });
});
