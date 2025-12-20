import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const uploadDir = join(process.cwd(), "public", "uploads", "products");

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
    const stock = parseInt(formData.get("stock") as string) || 100;
    const imageFile = formData.get("image") as File | null;

    if (!name || !imageFile) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // Normalize category: capitalize first letter
    const normalizedCategory = category
      ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
      : "General";

    // Save image file
    let imagePath = "/uploads/products/placeholder.png";
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
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        image: imagePath,
        category: normalizedCategory,
        stock
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
