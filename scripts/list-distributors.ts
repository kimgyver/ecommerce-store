import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true, emailDomain: true }
  });
  console.log(JSON.stringify(distributors, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
