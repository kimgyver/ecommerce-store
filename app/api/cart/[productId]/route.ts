import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductPrice } from "@/lib/pricing";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // Check user authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // Retrieve user cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Retrieve cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      },
      include: { product: true }
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Delete if quantity is 0
    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: cartItem.id }
      });

      return NextResponse.json({
        message: "Removed from cart"
      });
    }

    // Check if new quantity exceeds available stock
    // But allow reducing quantity (even if current quantity > stock)
    if (quantity > cartItem.quantity && quantity > cartItem.product.stock) {
      return NextResponse.json(
        {
          error: `Only ${cartItem.product.stock} items available in stock. You're trying to increase from ${cartItem.quantity} to ${quantity}.`,
          maxAvailable: cartItem.product.stock,
          currentQuantity: cartItem.quantity
        },
        { status: 400 }
      );
    }

    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
      include: { product: true }
    });

    // Calculate role-based price with new quantity
    const effectivePrice = await getProductPrice(
      updatedItem.productId,
      session.user.id,
      updatedItem.quantity
    );

    return NextResponse.json({
      message: "Cart updated",
      item: {
        id: updatedItem.productId,
        name: updatedItem.product.name,
        price: effectivePrice,
        quantity: updatedItem.quantity,
        image: updatedItem.product.image
      }
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // Check user authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId } = await params;

    // Retrieve user cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Delete cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      }
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id }
    });

    return NextResponse.json({
      message: "Removed from cart"
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
