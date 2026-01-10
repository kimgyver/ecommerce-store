import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCname } from "dns/promises";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const host = url.searchParams.get("host") || "";
    if (!host) {
      return NextResponse.json(
        { error: "Missing host parameter" },
        { status: 400 }
      );
    }

    try {
      const records = await resolveCname(host);
      return NextResponse.json({ verified: true, records });
    } catch (err: any) {
      // resolveCname throws if there is no CNAME record.
      return NextResponse.json({
        verified: false,
        error: err?.code || String(err)
      });
    }
  } catch (error) {
    console.error("verify-cname error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
