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

// Mock next-auth getServerSession
vi.mock("next-auth", () => ({
  getServerSession: async () => null
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
    }
  }
}));

import { GET } from "@/app/api/products/[id]/route";

describe("Product detail tenant pricing", () => {
  it("returns discounted price when x-tenant-host header is present", async () => {
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
