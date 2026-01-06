// lib/pricing.ts
import { prisma } from "./prisma";

/**
 * Get the effective price for a product based on user role and quantity
 * @param productId - Product ID
 * @param userId - User ID (optional for guest users)
 * @param quantity - Quantity being purchased
 * @returns Effective price per unit
 */
export async function getProductPrice(
  productId: string,
  userId: string | null,
  quantity: number = 1
): Promise<number> {
  console.log(
    `[Pricing] productId: ${productId}, userId: ${userId}, quantity: ${quantity}`
  );

  // Get product base price
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { price: true }
  });

  if (!product) {
    throw new Error("Product not found");
  }

  console.log(`[Pricing] Base price: ${product.price}`);

  // For guest users or customers, return base price
  if (!userId) {
    console.log(`[Pricing] No userId, returning base price`);
    return product.price;
  }

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  console.log(`[Pricing] User role: ${user?.role}`);

  if (!user || user.role === "customer") {
    console.log(`[Pricing] Customer, returning base price`);
    return product.price;
  }

  // For distributors, check for custom pricing
  if (user.role === "distributor") {
    const distributorPrice = await prisma.distributorPrice.findUnique({
      where: {
        productId_distributorId: {
          productId,
          distributorId: userId
        }
      }
    });

    console.log(`[Pricing] DistributorPrice found:`, distributorPrice);

    if (!distributorPrice) {
      // No custom pricing, return base price
      console.log(`[Pricing] No distributor pricing, returning base price`);
      return product.price;
    }

    // Check for quantity-based discount tiers
    if (distributorPrice.discountTiers) {
      const tiers = distributorPrice.discountTiers as Array<{
        minQty: number;
        maxQty: number | null;
        price: number;
      }>;

      console.log(`[Pricing] Checking tiers:`, tiers);

      // Find applicable tier based on quantity
      const applicableTier = tiers.find(tier => {
        const meetsMin = quantity >= tier.minQty;
        const meetsMax = tier.maxQty === null || quantity <= tier.maxQty;
        return meetsMin && meetsMax;
      });

      if (applicableTier) {
        console.log(`[Pricing] Tier found: ${applicableTier.price}`);
        return applicableTier.price;
      }
    }

    // Return custom base price
    console.log(
      `[Pricing] Returning custom base: ${distributorPrice.customPrice}`
    );
    return distributorPrice.customPrice;
  }

  // Default to base price
  console.log(`[Pricing] Default, returning base price`);
  return product.price;
}

/**
 * Get prices for multiple products in bulk (for cart)
 * @param items - Array of {productId, quantity}
 * @param userId - User ID
 * @returns Array of {productId, quantity, price}
 */
export async function getBulkProductPrices(
  items: Array<{ productId: string; quantity: number }>,
  userId: string | null
): Promise<Array<{ productId: string; quantity: number; price: number }>> {
  const pricesPromises = items.map(async item => {
    const price = await getProductPrice(item.productId, userId, item.quantity);
    return {
      productId: item.productId,
      quantity: item.quantity,
      price
    };
  });

  return Promise.all(pricesPromises);
}
