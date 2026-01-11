import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let distributor = await prisma.distributor.findFirst({
    where: { name: { contains: "samsung", mode: "insensitive" } }
  });
  if (!distributor) {
    // Fallback: match by emailDomain
    distributor = await prisma.distributor.findFirst({
      where: { emailDomain: { contains: "samsung", mode: "insensitive" } }
    });
  }
  if (!distributor) {
    console.error(
      "Distributor with name or emailDomain containing 'samsung' not found"
    );
    await prisma.$disconnect();
    return;
  }

  const domain = "samsung.localhost";
  const existing = await prisma.distributorDomain.findFirst({
    where: { distributorId: distributor.id, domain }
  });
  if (existing) {
    console.log("Domain already exists:", existing);
    await prisma.$disconnect();
    return;
  }

  const created = await prisma.distributorDomain.create({
    data: {
      distributorId: distributor.id,
      domain,
      status: "verified",
      details: { records: ["local-test"] }
    }
  });
  console.log("Created domain:", created);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
