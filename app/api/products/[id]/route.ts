import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductPrice, getProductPriceForDistributor } from "@/lib/pricing";
import { getTenantForHost } from "@/lib/tenant";

const uploadDir = join(process.cwd(), "public", "uploads", "products");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const productId = resolvedParams.id;

    // Debugging: log incoming tenant host in development to help diagnose tenant detection
    const incomingTenantHost =
      request.headers.get("x-tenant-host") || request.headers.get("host");
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Product API] incoming tenant host:", incomingTenantHost);
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // If no user session, try to detect tenant via middleware header (for subdomain POC)
    const tenantHost =
      request.headers.get("x-tenant-host") || request.headers.get("host") || "";
    const tenant = await getTenantForHost(tenantHost);

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

    // Apply role-based pricing
    let effectivePrice: number;
    // If the logged-in user is a distributor, use their pricing
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, distributorId: true }
      });

      if (user?.role === "distributor" && user.distributorId) {
        effectivePrice = await getProductPrice(productId, userId, 1);
      } else if (tenant) {
        // For customers on a tenant (subdomain) storefront, apply tenant pricing
        effectivePrice = await getProductPriceForDistributor(
          productId,
          tenant.id,
          1
        );
      } else {
        effectivePrice = await getProductPrice(productId, userId, 1);
      }
    } else {
      // No user session: if tenant is present, use tenant pricing
      if (tenant) {
        effectivePrice = await getProductPriceForDistributor(
          productId,
          tenant.id,
          1
        );
      } else {
        effectivePrice = await getProductPrice(productId, userId, 1);
      }
    }

    // Get discount tiers if user is a distributor OR tenant distributor for POC
    let discountTiers = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, distributorId: true }
      });

      if (user?.role === "distributor" && user.distributorId) {
        const distributorPrice = await prisma.distributorPrice.findUnique({
          where: {
            productId_distributorId: {
              productId,
              distributorId: user.distributorId
            }
          },
          select: {
            customPrice: true,
            discountTiers: true
          }
        });

        if (distributorPrice) {
          discountTiers = {
            customPrice: distributorPrice.customPrice,
            tiers: distributorPrice.discountTiers
          };
        }
      }
    }

    // Also show tenant-level distributor tiers if tenant configured (applies even if a customer is logged in)
    if (tenant) {
      const distributorPrice = await prisma.distributorPrice.findUnique({
        where: {
          productId_distributorId: { productId, distributorId: tenant.id }
        },
        select: { customPrice: true, discountTiers: true }
      });

      if (distributorPrice) {
        discountTiers = {
          customPrice: distributorPrice.customPrice,
          tiers: distributorPrice.discountTiers
        };
      }
    }

    return NextResponse.json({
      ...product,
      basePrice: product.price, // Original price
      price: effectivePrice, // B2B price if applicable
      discountTiers // Tiered pricing info for distributors
    });
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

    // Invalidate & warm stats cache asynchronously (product update affects totals/topProducts)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Failed to warm stats after product update:", msg, err);
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after product update:",
        e
      );
    }

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

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete the product image file if it exists and is not a placeholder
    if (product.image && product.image.startsWith("/uploads/products/")) {
      try {
        const imagePath = join(process.cwd(), "public", product.image);
        await unlink(imagePath);
        console.log(`Deleted image file: ${imagePath}`);
      } catch (fileError) {
        console.error("Error deleting image file:", fileError);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete the product
    // Related data (reviews, cart items, order items, wishlist) will be automatically deleted
    // due to onDelete: Cascade in the database schema
    await prisma.product.delete({
      where: { id: productId }
    });

    // Invalidate & warm stats cache asynchronously (product delete affects totals/topProducts)
    try {
      const stats = await import("@/lib/stats-cache");
      const statsRoutes = await import("@/app/api/admin/statistics/route");
      stats.default.invalidateStatsCache();
      stats.default
        .maybeWarmStats(statsRoutes.computeStatistics)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Failed to warm stats after product delete:", msg, err);
        });
    } catch (e) {
      console.error(
        "Error invalidating/warming stats cache after product delete:",
        e
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
