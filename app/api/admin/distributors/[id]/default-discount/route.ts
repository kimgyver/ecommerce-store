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

    // Validate discount percentage. Allow null to mean "remove default discount".
    if (
      defaultDiscountPercent !== null &&
      (typeof defaultDiscountPercent !== "number" ||
        defaultDiscountPercent < 0 ||
        defaultDiscountPercent > 100)
    ) {
      return NextResponse.json(
        { error: "Invalid discount percentage. Must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Verify distributor exists
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true }
    });

    if (!distributor) {
      return NextResponse.json(
        { error: "Distributor not found" },
        { status: 404 }
      );
    }

    // Update default discount
    const updatedDistributor = await prisma.distributor.update({
      where: { id: distributorId },
      data: { defaultDiscountPercent },
      select: {
        id: true,
        name: true,
        emailDomain: true,
        defaultDiscountPercent: true
      }
    });

    // Invalidate & warm stats cache asynchronously (default discount change may affect pricing)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            "Failed to warm stats after default discount update:",
            msg,
            err
          );
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after default discount update:",
        e
      );
    }

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
