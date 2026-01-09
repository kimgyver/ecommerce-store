import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, name } = body;

    // Build update data
    const updateData: {
      role?: string;
      name?: string;
    } = {};

    if (role !== undefined) {
      // Validate role
      if (!["customer", "distributor", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        distributor: {
          select: {
            id: true,
            name: true,
            emailDomain: true
          }
        }
      }
    });

    // Invalidate & warm stats cache asynchronously (user role changes affect usersByRole)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Failed to warm stats after user update:", msg, err);
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after user update:",
        e
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
