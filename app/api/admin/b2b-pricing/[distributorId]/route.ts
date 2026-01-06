import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ distributorId: string }> }
) {
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

    const { distributorId } = await params;

    // Get all pricing rules for this distributor
    const pricingRules = await prisma.distributorPrice.findMany({
      where: {
        distributorId
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true
          }
        }
      }
    });

    return NextResponse.json({ pricingRules });
  } catch (error) {
    console.error("Error fetching distributor pricing:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
