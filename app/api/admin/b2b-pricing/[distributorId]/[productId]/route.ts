import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/b2b-pricing/[distributorId]/[productId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ distributorId: string; productId: string }> }
) {
  try {
    const { distributorId, productId } = await params;
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

    // Get distributor pricing
    const distributorPrice = await prisma.distributorPrice.findUnique({
      where: {
        productId_distributorId: {
          productId,
          distributorId
        }
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            category: true
          }
        },
        distributor: {
          select: {
            id: true,
            name: true,
            emailDomain: true
          }
        }
      }
    });

    // Get product info even if no custom pricing exists
    if (!distributorPrice) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          category: true
        }
      });

      const distributor = await prisma.distributor.findUnique({
        where: { id: distributorId },
        select: {
          id: true,
          name: true,
          emailDomain: true
        }
      });

      return NextResponse.json({
        exists: false,
        product,
        distributor
      });
    }

    return NextResponse.json({
      exists: true,
      pricing: distributorPrice
    });
  } catch (error) {
    console.error("Get B2B pricing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/b2b-pricing/[distributorId]/[productId]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ distributorId: string; productId: string }> }
) {
  try {
    const { distributorId, productId } = await params;
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

    const body = await request.json();
    const { customPrice, discountTiers } = body;

    // Validate input
    if (typeof customPrice !== "number" || customPrice < 0) {
      return NextResponse.json(
        { error: "Invalid custom price" },
        { status: 400 }
      );
    }

    // Upsert distributor pricing
    const distributorPrice = await prisma.distributorPrice.upsert({
      where: {
        productId_distributorId: {
          productId,
          distributorId
        }
      },
      update: {
        customPrice,
        discountTiers: discountTiers || null
      },
      create: {
        productId,
        distributorId,
        customPrice,
        discountTiers: discountTiers || null
      },
      include: {
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });

    // Invalidate & warm stats cache asynchronously (B2B pricing change may affect product selection/revenue)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            "Failed to warm stats after B2B pricing update:",
            msg,
            err
          );
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after B2B pricing update:",
        e
      );
    }

    return NextResponse.json({ success: true, pricing: distributorPrice });
  } catch (error) {
    console.error("Update B2B pricing error:", error);
    return NextResponse.json(
      { error: "Failed to update pricing" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/b2b-pricing/[distributorId]/[productId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ distributorId: string; productId: string }> }
) {
  try {
    const { distributorId, productId } = await params;
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

    // Delete distributor pricing
    await prisma.distributorPrice.delete({
      where: {
        productId_distributorId: {
          productId,
          distributorId
        }
      }
    });

    // Invalidate & warm stats cache asynchronously (B2B pricing delete may affect product selection/revenue)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            "Failed to warm stats after B2B pricing delete:",
            msg,
            err
          );
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after B2B pricing delete:",
        e
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete B2B pricing error:", error);
    return NextResponse.json(
      { error: "Failed to delete pricing" },
      { status: 500 }
    );
  }
}
