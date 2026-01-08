import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePONumber, calculatePaymentDueDate } from "@/lib/po-generator";
import { sendPOEmail } from "@/lib/email";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  basePrice?: number;
}

interface ShippingInfo {
  name: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
}

interface OrderRequest {
  items: CartItem[];
  shipping: ShippingInfo;
  paymentIntentId?: string;
  paymentMethod?: "stripe" | "po";
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
    const { items, shipping, paymentIntentId, paymentMethod = "stripe" } = body;
    const userId = session.user.id;

    // Validate based on payment method
    if (!items || items.length === 0 || !shipping) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // paymentIntentId is required for Stripe, optional for PO
    if (paymentMethod === "stripe" && !paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent ID required for Stripe payment" },
        { status: 400 }
      );
    }

    // Get user info to check if distributor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        distributorId: true
      }
    });

    // Generate PO number for B2B orders
    const isDistributor = user?.role === "distributor" && user?.distributorId;
    const poNumber = isDistributor ? await generatePONumber() : null;
    const paymentDueDate = isDistributor ? calculatePaymentDueDate(30) : null; // Net 30 for B2B

    // Determine order status based on payment method
    const orderStatus = paymentMethod === "po" ? "pending_payment" : "pending";

    console.log("=== Order Creation Debug ===");
    console.log("User:", {
      role: user?.role,
      distributorId: user?.distributorId
    });
    console.log("Payment Method:", paymentMethod);
    console.log("isDistributor:", isDistributor);
    console.log("Generated PO:", poNumber);
    console.log("Payment Due Date:", paymentDueDate);
    console.log("Order Status:", orderStatus);

    // 1. Check and update stock, create order, clear cart in a single transaction
    let order;
    try {
      order = await prisma.$transaction(
        async tx => {
          // Check and update stock
          for (const item of items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId }
            });
            if (!product || product.stock < item.quantity) {
              throw new Error(`Product ${item.productId} out of stock`);
            }
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
              paymentIntentId: paymentIntentId || null,
              poNumber,
              paymentDueDate,
              paymentMethod,
              status: orderStatus,
              recipientName: shipping.name,
              recipientPhone: shipping.phone,
              shippingPostalCode: shipping.postalCode,
              shippingAddress1: shipping.address1,
              shippingAddress2: shipping.address2,
              items: {
                create: items.map((item: CartItem) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  basePrice: item.basePrice
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
        },
        {
          maxWait: 10000, // 10 seconds
          timeout: 20000 // 20 seconds
        }
      );
    } catch (err) {
      console.error("Order transaction error:", err);
      // 트랜잭션 내에서 발생한 에러를 명확히 전달
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : "Order transaction failed"
        },
        { status: 400 }
      );
    }

    // Send email notification for PO orders (non-blocking)
    if (paymentMethod === "po" && poNumber && order) {
      console.log("[Email] PO order detected, preparing to send email...");
      console.log("[Email] Payment method:", paymentMethod);
      console.log("[Email] PO Number:", poNumber);
      console.log("[Email] Order ID:", order.id);

      // Get user details for email
      const userDetails = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true
        }
      });

      console.log("[Email] User details:", userDetails);

      // Get order items with product details
      const orderWithProducts = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      console.log(
        "[Email] Order with products:",
        orderWithProducts ? "Found" : "Not found"
      );

      if (userDetails && orderWithProducts) {
        console.log("[Email] Calling sendPOEmail...");
        // Send email asynchronously (don't await - non-blocking)
        sendPOEmail({
          orderId: order.id,
          poNumber,
          customerName: userDetails.name || "Valued Customer",
          customerEmail: userDetails.email,
          totalAmount: order.totalPrice,
          paymentDueDate: paymentDueDate!,
          orderDate: order.createdAt,
          items: orderWithProducts.items.map(item => ({
            productName: item.product.name,
            sku: item.product.sku || undefined,
            quantity: item.quantity,
            price: item.price,
            basePrice: item.basePrice || undefined
          })),
          shippingAddress: {
            recipientName: order.recipientName || "",
            recipientPhone: order.recipientPhone || "",
            postalCode: order.shippingPostalCode || "",
            address1: order.shippingAddress1 || "",
            address2: order.shippingAddress2 || undefined
          }
        }).catch(err => {
          // Log but don't fail the request
          console.error("[Email] Failed to send PO email:", err);
        });
      }
    }

    return NextResponse.json(
      {
        message: "Order created successfully",
        order: {
          id: order.id,
          totalPrice: order.totalPrice,
          status: order.status,
          createdAt: order.createdAt,
          items: order.items
        }
      },
      { status: 201 }
    );
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

export async function GET() {
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

    // Map shipping address information to shipping object
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
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
