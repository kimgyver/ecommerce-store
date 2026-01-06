import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  paymentIntentId: string;
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
    const { items, shipping, paymentIntentId } = body;
    const userId = session.user.id;

    if (!items || items.length === 0 || !shipping || !paymentIntentId) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

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
              paymentIntentId,
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

    // 배송지 정보를 shipping 객체로 매핑해서 반환
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
