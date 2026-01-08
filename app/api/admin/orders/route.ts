import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // Check user authentication and admin role
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

    // Fetch ALL orders for admin
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        userId: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        poNumber: true,
        paymentDueDate: true,
        paymentMethod: true,
        invoiceNumber: true,
        recipientName: true,
        recipientPhone: true,
        shippingPostalCode: true,
        shippingAddress1: true,
        shippingAddress2: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map shipping info for consistency
    const ordersWithShipping = orders.map(order => ({
      ...order,
      shipping: {
        name: order.recipientName || "",
        phone: order.recipientPhone || "",
        postalCode: order.shippingPostalCode || "",
        address1: order.shippingAddress1 || "",
        address2: order.shippingAddress2 || ""
      }
    }));

    return NextResponse.json(ordersWithShipping);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
