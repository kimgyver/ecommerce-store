import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Missing payment intent ID" },
        { status: 400 }
      );
    }

    // Check if order already exists for this payment intent (idempotency)
    const existingOrder = await prisma.order.findUnique({
      where: {
        paymentIntentId: paymentIntentId
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (existingOrder) {
      // Order already created, but still clear cart in case it wasn't cleared before
      const cart = await prisma.cart.findUnique({
        where: { userId: session.user.id }
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      // Return existing order
      return NextResponse.json({
        order: {
          id: existingOrder.id,
          status: existingOrder.status,
          totalPrice: existingOrder.totalPrice,
          items: existingOrder.items
        }
      });
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate total price
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Create order and clear cart in a transaction
    const order = await prisma.$transaction(async tx => {
      // Create order with paymentIntentId (unique constraint prevents duplicates)
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          paymentIntentId,
          totalPrice: totalPrice,
          status: "pending",
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Decrease stock for each product in the order
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // Clear cart immediately after order creation
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return newOrder;
    });

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        items: order.items
      }
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
