import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/admin/quotes - List all quote requests
export async function GET(req: NextRequest) {
  // In Next.js app directory, the request object must be passed explicitly for session to work correctly
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quotes = await prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      requester: true
    }
  });
  return NextResponse.json(quotes);
}
