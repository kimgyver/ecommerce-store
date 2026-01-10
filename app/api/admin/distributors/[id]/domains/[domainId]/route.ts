import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const { id, domainId } = await params;
  if (!domainId)
    return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
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

    const domainRecord = await prisma.distributorDomain.findUnique({
      where: { id: domainId }
    });
    if (!domainRecord || domainRecord.distributorId !== id)
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });

    await prisma.distributorDomain.delete({ where: { id: domainId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
