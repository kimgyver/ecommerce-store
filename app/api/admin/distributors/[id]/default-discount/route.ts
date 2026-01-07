import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/distributors/[id]/default-discount - Update default discount
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const distributorId = resolvedParams.id;

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

    const { defaultDiscountPercent } = await request.json();

    // Validate discount percentage
    if (
      typeof defaultDiscountPercent !== "number" ||
      defaultDiscountPercent < 0 ||
      defaultDiscountPercent > 100
    ) {
      return NextResponse.json(
        { error: "Invalid discount percentage. Must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Verify distributor exists
    const distributor = await prisma.user.findUnique({
      where: { id: distributorId },
      select: { role: true }
    });

    if (!distributor || distributor.role !== "distributor") {
      return NextResponse.json(
        { error: "Distributor not found" },
        { status: 404 }
      );
    }

    // Update default discount
    const updatedDistributor = await prisma.user.update({
      where: { id: distributorId },
      data: { defaultDiscountPercent },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        defaultDiscountPercent: true
      }
    });

    return NextResponse.json({
      success: true,
      distributor: updatedDistributor
    });
  } catch (error) {
    console.error("Update default discount error:", error);
    return NextResponse.json(
      { error: "Failed to update default discount" },
      { status: 500 }
    );
  }
}
