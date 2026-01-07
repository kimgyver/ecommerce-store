import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/distributors/[id]/category-discounts - Get category discounts for distributor
export async function GET(
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

    // Get all category discounts for this distributor
    const categoryDiscounts = await prisma.categoryDiscount.findMany({
      where: { distributorId },
      orderBy: { category: "asc" }
    });

    return NextResponse.json({ categoryDiscounts });
  } catch (error) {
    console.error("Get category discounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category discounts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/distributors/[id]/category-discounts - Create or update category discount
export async function POST(
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

    const { category, discountPercent } = await request.json();

    // Validate
    if (!category || typeof discountPercent !== "number") {
      return NextResponse.json(
        { error: "Category and discountPercent are required" },
        { status: 400 }
      );
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: "Discount percent must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Upsert category discount
    const categoryDiscount = await prisma.categoryDiscount.upsert({
      where: {
        distributorId_category: {
          distributorId,
          category
        }
      },
      update: {
        discountPercent
      },
      create: {
        distributorId,
        category,
        discountPercent
      }
    });

    return NextResponse.json({ success: true, categoryDiscount });
  } catch (error) {
    console.error("Create/update category discount error:", error);
    return NextResponse.json(
      { error: "Failed to save category discount" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/distributors/[id]/category-discounts - Delete category discount
export async function DELETE(
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

    const { category } = await request.json();

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    await prisma.categoryDiscount.delete({
      where: {
        distributorId_category: {
          distributorId,
          category
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category discount error:", error);
    return NextResponse.json(
      { error: "Failed to delete category discount" },
      { status: 500 }
    );
  }
}
