import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    distributorDomain: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("dns/promises", () => ({
  default: { resolve4: vi.fn(), resolveCname: vi.fn() }
}));

import {
  GET,
  POST as POST_DOMAINS
} from "@/app/api/admin/distributors/[id]/domains/route";
import { DELETE as DELETE_DOMAIN } from "@/app/api/admin/distributors/[id]/domains/[domainId]/route";
import * as verifyHandler from "@/app/api/admin/distributors/[id]/domains/[domainId]/verify/route";
import { prisma } from "@/lib/prisma";
import dns from "dns/promises";
import { getServerSession } from "next-auth";

describe("Admin domains API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default admin session
    (getServerSession as any).mockResolvedValue({ user: { id: "u1" } });
    (prisma.user.findUnique as any).mockResolvedValue({ role: "admin" });
  });

  it("lists domains", async () => {
    (prisma.distributorDomain.findMany as any).mockResolvedValue([
      { id: "d1", domain: "example.com", status: "verified" }
    ]);
    const res = await GET(new Request("/"), { params: { id: "dist1" } } as any);
    const json = await res.json();
    expect(json.domains).toHaveLength(1);
  });

  it("creates a domain (admin only)", async () => {
    (prisma.distributorDomain.findFirst as any) = vi
      .fn()
      .mockResolvedValue(null);
    (prisma.distributorDomain.create as any).mockResolvedValue({
      id: "d2",
      domain: "new.com",
      status: "pending"
    });
    const req = new Request("/", {
      method: "POST",
      body: JSON.stringify({ domain: "new.com" })
    });
    const res = await POST_DOMAINS(
      req as any,
      { params: { id: "dist1" } } as any
    );
    const json = await res.json();
    expect(json.domain.domain).toBe("new.com");
  });

  it("verifies a domain via DNS", async () => {
    (prisma.distributorDomain.findUnique as any).mockResolvedValue({
      id: "d1",
      domain: "chromet.localhost",
      distributorId: "dist1"
    });
    (dns.resolve4 as any).mockResolvedValue(["127.0.0.1"]);
    (prisma.distributorDomain.update as any).mockResolvedValue({
      id: "d1",
      status: "verified",
      lastCheckedAt: new Date().toISOString()
    });

    const res = await verifyHandler.POST(new Request("/"), {
      params: { id: "dist1", domainId: "d1" }
    } as any);
    const json = await res.json();
    expect(json.domain.status).toBe("verified");
    expect(json.domain.lastCheckedAt).toBeTruthy();
  });

  it("handles verification failure when DNS lookup fails", async () => {
    (prisma.distributorDomain.findUnique as any).mockResolvedValue({
      id: "d2",
      domain: "nonexistentdomain.example",
      distributorId: "dist1"
    });
    (dns.resolve4 as any).mockRejectedValue(new Error("ENOTFOUND"));
    (dns.resolveCname as any).mockRejectedValue(new Error("ENOTFOUND"));
    (prisma.distributorDomain.update as any).mockResolvedValue({
      id: "d2",
      status: "failed",
      details: { error: "ENOTFOUND" }
    });

    const res = await verifyHandler.POST(new Request("/"), {
      params: { id: "dist1", domainId: "d2" }
    } as any);
    const json = await res.json();
    expect(json.domain.status).toBe("failed");
    expect(json.domain.details.error).toBeTruthy();
  });

  it("deletes a domain (admin only)", async () => {
    (prisma.distributorDomain.findUnique as any).mockResolvedValue({
      id: "d1",
      domain: "a.com",
      distributorId: "dist1"
    });
    (prisma.distributorDomain.delete as any).mockResolvedValue({});

    const res = await DELETE_DOMAIN(new Request("/"), {
      params: { id: "dist1", domainId: "d1" }
    } as any);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("delete returns 404 when not found or mismatch", async () => {
    (prisma.distributorDomain.findUnique as any).mockResolvedValue(null);
    const res = await DELETE_DOMAIN(new Request("/"), {
      params: { id: "dist1", domainId: "d2" }
    } as any);
    const json = await res.json();
    expect(json.error).toBe("Domain not found");
  });
});
