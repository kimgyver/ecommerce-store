// scripts/create-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Creating admin account...\n");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {
      role: "admin"
    },
    create: {
      email: "admin@test.com",
      name: "Admin User",
      password: hashedPassword,
      role: "admin",
      phone: "555-0000",
      address: "Admin Office"
    }
  });

  console.log(`✅ Admin account created/updated: ${admin.email}`);
  console.log(`   Login: admin@test.com / admin123`);
  console.log(`   Role: ${admin.role}\n`);
  console.log("🎉 Done! You can now login as admin.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
