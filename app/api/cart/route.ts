import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductPrice } from "@/lib/pricing";

interface CartItemWithProduct {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
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

    // Retrieve user cart sorted by creation time
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    // Create cart if not exists
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
    }

    // Format for client with role-based pricing
    const formattedItemsPromises = cart.items.map(
      async (item: CartItemWithProduct) => {
        const effectivePrice = await getProductPrice(
          item.productId,
          session.user.id,
          item.quantity
        );
        return {
          id: item.productId,
          name: item.product.name,
          basePrice: item.product.price, // Original price
          price: effectivePrice, // B2B price if applicable
          quantity: item.quantity,
          image: item.product.image
        };
      }
    );

    const formattedItems = await Promise.all(formattedItemsPromises);

    const formattedCart = {
      id: cart.id,
      items: formattedItems
    };

    return NextResponse.json(formattedCart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || quantity < 1) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Check product exists and has sufficient stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if requested quantity exceeds available stock
    if (quantity > product.stock) {
      return NextResponse.json(
        { error: `Only ${product.stock} items available in stock` },
        { status: 400 }
      );
    }

    // Retrieve or create user cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id
        }
      });
    }

    // Add or update cart item
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      }
    });

    let cartItem;
    if (existingItem) {
      // Check if total quantity would exceed stock
      const totalQuantity = existingItem.quantity + quantity;
      if (totalQuantity > product.stock) {
        return NextResponse.json(
          {
            error: `Only ${product.stock} items available. You already have ${existingItem.quantity} in cart.`
          },
          { status: 400 }
        );
      }
      // Increase existing item quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: totalQuantity
        },
        include: { product: true }
      });
    } else {
      // Add new item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        },
        include: { product: true }
      });
    }

    return NextResponse.json(
      {
        message: "Added to cart",
        item: {
          id: cartItem.productId,
          name: cartItem.product.name,
          price: cartItem.product.price,
          quantity: cartItem.quantity,
          image: cartItem.product.image
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}
