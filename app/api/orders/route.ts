import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface OrderRequest {
  items: CartItem[];
}

export async function POST(request: Request) {
  try {
    // Check user authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as OrderRequest;
    const { items } = body;
    const userId = session.user.id; // Set userId on server (ignore client input)

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Create order with transaction
    const order = await prisma.$transaction(async tx => {
      // Check and update stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product || product.stock < item.quantity) {
          throw new Error(`Product ${item.productId} out of stock`);
        }

        // Decrease stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Calculate total price
      const totalPrice = items.reduce(
        (sum: number, item: CartItem) => sum + item.price * item.quantity,
        0
      );

      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice,
          items: {
            create: items.map((item: CartItem) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      // Clear cart after order completion
      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId
          }
        }
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create order"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Check user authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id; // Only retrieve own orders

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
