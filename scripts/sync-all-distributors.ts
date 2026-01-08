// scripts/sync-all-distributors.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncAllDistributors() {
  console.log("🔄 Syncing all users to distributors...\n");

  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true, emailDomain: true }
  });

  console.log(`Found ${distributors.length} distributors\n`);

  let totalUpdated = 0;

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
      console.log(
        `✅ ${dist.name} (@${dist.emailDomain}): ${result.count} user(s) synced`
      );
      totalUpdated += result.count;
    }
  }

  console.log(`\n✨ Total synced: ${totalUpdated} user(s)`);

  await prisma.$disconnect();
}

syncAllDistributors().catch(error => {
  console.error("Error:", error);
  process.exit(1);
});
