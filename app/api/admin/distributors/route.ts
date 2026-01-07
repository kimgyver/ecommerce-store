import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/distributors - Get all distributors
export async function GET() {
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

    // Get all distributors
    const distributors = await prisma.user.findMany({
      where: { role: "distributor" },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        phone: true,
        createdAt: true,
        defaultDiscountPercent: true,
        _count: {
          select: {
            distributorPrices: true,
            categoryDiscounts: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ distributors });
  } catch (error) {
    console.error("Get distributors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch distributors" },
      { status: 500 }
    );
  }
}
