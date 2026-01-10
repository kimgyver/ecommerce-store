import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const domains = await prisma.distributorDomain.findMany({
      where: { distributorId: id },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ domains });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // params is a Promise in App Router; await it to get values
  const { params } = arguments[1] as { params: Promise<{ id: string }> };
  const { id } = await params;
  if (!id)
    return NextResponse.json(
      { error: "Missing distributor id" },
      { status: 400 }
    );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { domain } = await request.json();
    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const normalized = domain.toLowerCase().trim();

    // Check for duplicate
    const existing = await prisma.distributorDomain.findFirst({
      where: { distributorId: id, domain: normalized }
    });
    if (existing)
      return NextResponse.json(
        { error: "Domain already registered" },
        { status: 400 }
      );

    const created = await prisma.distributorDomain.create({
      data: { distributorId: id, domain: normalized, status: "pending" }
    });

    return NextResponse.json({ domain: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
