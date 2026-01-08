// lib/sync-distributors.ts
import { prisma } from "./prisma";

/**
 * Sync users with matching email domains to their distributors
 * Call this after creating/updating a distributor
 */
export async function syncDistributorUsers(
  distributorId: string
): Promise<{ updated: number }> {
  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    select: { emailDomain: true }
  });

  if (!distributor) {
    throw new Error("Distributor not found");
  }

  // Update all users with matching email domain
  const result = await prisma.user.updateMany({
    where: {
      email: {
        endsWith: `@${distributor.emailDomain}`
      },
      distributorId: null // Only update unlinked users
    },
    data: {
      distributorId: distributorId,
      role: "distributor"
    }
  });

  return { updated: result.count };
}

/**
 * Sync ALL users to distributors based on email domains
 * Useful for one-time migration or fixing existing data
 */
export async function syncAllDistributorUsers(): Promise<{
  updated: number;
  details: Array<{ distributor: string; count: number }>;
}> {
  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true, emailDomain: true }
  });

  let totalUpdated = 0;
  const details: Array<{ distributor: string; count: number }> = [];

  for (const dist of distributors) {
    const result = await prisma.user.updateMany({
      where: {
        email: {
          endsWith: `@${dist.emailDomain}`
        },
        OR: [{ distributorId: null }, { distributorId: { not: dist.id } }]
      },
      data: {
        distributorId: dist.id,
        role: "distributor"
      }
    });

    if (result.count > 0) {
      totalUpdated += result.count;
      details.push({ distributor: dist.name, count: result.count });
    }
  }

  return { updated: totalUpdated, details };
}
