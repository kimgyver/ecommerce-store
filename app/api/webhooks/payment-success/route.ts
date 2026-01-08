import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generatePONumber, calculatePaymentDueDate } from "@/lib/po-generator";

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

    // Get user info to check if distributor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        distributorId: true
      }
    });

    console.log("=== Webhook Debug ===");
    console.log("User info:", user);
    console.log(
      "Is distributor check:",
      user?.role === "distributor" && user?.distributorId
    );

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
      // Generate PO number for B2B orders
      const isDistributor = user?.role === "distributor" && user?.distributorId;
      console.log("=== PO Generation ===");
      console.log("isDistributor:", isDistributor);
      console.log("user.role:", user?.role);
      console.log("user.distributorId:", user?.distributorId);

      const poNumber = isDistributor ? await generatePONumber() : null;
      const paymentDueDate = isDistributor ? calculatePaymentDueDate(30) : null; // Net 30 for B2B

      console.log("Generated PO:", poNumber);
      console.log("Payment Due Date:", paymentDueDate);

      // Create order with paymentIntentId (unique constraint prevents duplicates)
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          paymentIntentId,
          totalPrice: totalPrice,
          status: "pending",
          poNumber,
          paymentDueDate,
          paymentMethod: "stripe",
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
        poNumber: order.poNumber,
        paymentDueDate: order.paymentDueDate,
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
