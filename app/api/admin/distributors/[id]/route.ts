import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/distributors/[id] - Update distributor info
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { name, emailDomain, logoUrl, brandColor } = await request.json();

    // Validate required fields
    if (!name || !emailDomain) {
      return NextResponse.json(
        { error: "Name and email domain are required" },
        { status: 400 }
      );
    }

    // Check if email domain is being changed and if it conflicts with another distributor
    const existing = await prisma.distributor.findUnique({
      where: { emailDomain: emailDomain.toLowerCase() }
    });

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "A distributor with this email domain already exists" },
        { status: 400 }
      );
    }

    // Update distributor
    const distributor = await prisma.distributor.update({
      where: { id },
      data: {
        name,
        emailDomain: emailDomain.toLowerCase(),
        logoUrl: logoUrl || null,
        brandColor: brandColor || null
      }
    });

    return NextResponse.json({ distributor });
  } catch (error) {
    console.error("Update distributor error:", error);
    return NextResponse.json(
      { error: "Failed to update distributor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/distributors/[id] - Delete distributor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if distributor has users
    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            distributorPrices: true,
            categoryDiscounts: true
          }
        }
      }
    });

    if (!distributor) {
      return NextResponse.json(
        { error: "Distributor not found" },
        { status: 404 }
      );
    }

    if (distributor._count.users > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete distributor with ${distributor._count.users} employee(s). Please reassign or delete users first.`
        },
        { status: 400 }
      );
    }

    // Delete related data first
    await prisma.$transaction([
      // Delete distributor prices
      prisma.distributorPrice.deleteMany({
        where: { distributorId: id }
      }),
      // Delete category discounts
      prisma.categoryDiscount.deleteMany({
        where: { distributorId: id }
      }),
      // Delete distributor
      prisma.distributor.delete({
        where: { id }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete distributor error:", error);
    return NextResponse.json(
      { error: "Failed to delete distributor" },
      { status: 500 }
    );
  }
}
