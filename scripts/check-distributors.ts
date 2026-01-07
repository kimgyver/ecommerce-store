import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDistributors() {
  try {
    const distributors = await prisma.user.findMany({
      where: { role: "distributor" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        distributorId: true,
        distributor: {
          select: {
            id: true,
            name: true,
            emailDomain: true,
            defaultDiscountPercent: true
          }
        }
      }
    });

    console.log(`Found ${distributors.length} distributors:`);
    console.log(JSON.stringify(distributors, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDistributors();
