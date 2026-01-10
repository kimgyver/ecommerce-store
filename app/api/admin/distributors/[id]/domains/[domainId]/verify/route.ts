import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dns from "dns/promises";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const { id, domainId } = await params;
  try {
    if (!domainId) {
      return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const domainRecord = await prisma.distributorDomain.findUnique({
      where: { id: domainId }
    });
    if (!domainRecord || domainRecord.distributorId !== id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const domain = domainRecord.domain;

    // Try resolving A records or CNAMEs with a timeout to avoid long DNS hangs
    const dnsTimeout = 5000; // ms
    const runWithTimeout = async <T>(p: Promise<T>, timeoutMs: number) => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error("DNS resolution timed out")),
            timeoutMs
          )
        )
      ]);
    };

    let result: any = { success: false, records: [] };
    try {
      const aRecords = await runWithTimeout(dns.resolve4(domain), dnsTimeout);
      result.success = true;
      result.records = aRecords;
    } catch (e) {
      // try CNAME with timeout
      try {
        const c = await runWithTimeout(dns.resolveCname(domain), dnsTimeout);
        result.success = true;
        result.records = c;
      } catch (e2) {
        result.success = false;
        result.error = String(e2 instanceof Error ? e2.message : e2);
      }
    }

    const status = result.success ? "verified" : "failed";

    const updated = await prisma.distributorDomain.update({
      where: { id: domainId },
      data: { status, lastCheckedAt: new Date(), details: result }
    });

    return NextResponse.json({ domain: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
