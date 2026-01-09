import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductPrice } from "@/lib/pricing";

const uploadDir = join(process.cwd(), "public", "uploads", "products");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    // Apply role-based pricing to each product
    const productsWithPricing = await Promise.all(
      products.map(async product => {
        try {
          const effectivePrice = await getProductPrice(
            product.id,
            userId,
            1 // Default quantity for listing
          );
          return {
            ...product,
            basePrice: product.price, // Original price
            price: effectivePrice // B2B price if applicable
          };
        } catch (priceError) {
          console.error(
            `Error getting price for product ${product.id}:`,
            priceError
          );
          // Return base price if pricing fails
          return product;
        }
      })
    );

    return NextResponse.json(productsWithPricing);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : String(error)
      },
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

    // Generate SKU: Category prefix + timestamp
    const skuPrefix = normalizedCategory.substring(0, 3).toUpperCase();
    const sku = `${skuPrefix}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price,
        image: imagePath,
        category: normalizedCategory,
        stock
      }
    });

    // Invalidate & warm stats cache asynchronously (product affects totals/topProducts)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Failed to warm stats after product create:", msg, err);
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after product create:",
        e
      );
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
