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

    // Get all distributor companies
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        emailDomain: true,
        logoUrl: true,
        brandColor: true,
        defaultDiscountPercent: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            distributorPrices: true
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

// POST /api/admin/distributors - Create new distributor
export async function POST(request: Request) {
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

    const { name, emailDomain, logoUrl, brandColor, defaultDiscountPercent } =
      await request.json();

    // Validate required fields
    if (!name || !emailDomain) {
      return NextResponse.json(
        { error: "Name and email domain are required" },
        { status: 400 }
      );
    }

    // Check if email domain already exists
    const existing = await prisma.distributor.findUnique({
      where: { emailDomain }
    });

    if (existing) {
      return NextResponse.json(
        { error: "A distributor with this email domain already exists" },
        { status: 400 }
      );
    }

    // Create new distributor
    const distributor = await prisma.distributor.create({
      data: {
        name,
        emailDomain: emailDomain.toLowerCase(),
        logoUrl: logoUrl || null,
        brandColor: brandColor || null,
        defaultDiscountPercent: defaultDiscountPercent || null
      }
    });

    return NextResponse.json({ distributor }, { status: 201 });
  } catch (error) {
    console.error("Create distributor error:", error);
    return NextResponse.json(
      { error: "Failed to create distributor" },
      { status: 500 }
    );
  }
}
