import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const uploadDir = join(process.cwd(), "public", "uploads", "products");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const productId = resolvedParams.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const productId = resolvedParams.id;

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceStr = formData.get("price") as string;
    const stockStr = formData.get("stock") as string;
    const category = formData.get("category") as string;
    const imageFile = formData.get("image") as File | null;
    const existingImage = formData.get("existingImage") as string | null;

    // Parse numeric values with fallback
    const price = priceStr ? parseFloat(priceStr) : 0;
    const stock = stockStr ? parseInt(stockStr, 10) : 0;

    // Get current product
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let imagePath = currentProduct.image;

    // If a new image file is provided, save it
    if (imageFile) {
      try {
        await mkdir(uploadDir, { recursive: true });
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const filename = `${Date.now()}-${imageFile.name}`;
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);
        imagePath = `/uploads/products/${filename}`;
      } catch (uploadError) {
        console.error("Error saving image:", uploadError);
        return NextResponse.json(
          { error: "Failed to save image" },
          { status: 500 }
        );
      }
    } else if (existingImage && existingImage !== currentProduct.image) {
      // If existingImage is provided and different, use it
      imagePath = existingImage;
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        price,
        image: imagePath,
        category,
        stock
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const productId = resolvedParams.id;

    await prisma.product.delete({
      where: { id: productId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
