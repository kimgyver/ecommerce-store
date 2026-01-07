import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Test what the API query returns
    const distributors = await prisma.user.findMany({
      where: { role: "distributor" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        distributorId: true,
        distributor: {
          select: {
            id: true,
            name: true,
            emailDomain: true,
            defaultDiscountPercent: true,
            _count: {
              select: {
                distributorPrices: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("API would return:");
    console.log(JSON.stringify({ distributors }, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
