const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const sampleProducts = [
  {
    sku: "WH-001",
    name: "Wireless Headphones",
    price: 79.99,
    image: "/products/headphones.svg",
    description:
      "Experience perfect sound with our high-quality wireless headphones.",
    category: "Electronics",
    stock: 50
  },
  {
    sku: "SW-001",
    name: "Smartwatch",
    price: 199.99,
    image: "/products/smartwatch.svg",
    description: "Stylish smartwatch with modern design and features",
    category: "Electronics",
    stock: 30
  },
  {
    sku: "CAM-001",
    name: "Camera",
    price: 599.99,
    image: "/products/camera.svg",
    description: "Professional-grade camera to capture perfect moments.",
    category: "Electronics",
    stock: 15
  },
  {
    sku: "LAP-001",
    name: "Laptop",
    price: 1299.99,
    image: "/products/laptop.svg",
    description: "High-performance laptop to boost your productivity.",
    category: "Computers",
    stock: 20
  },
  {
    sku: "MOU-001",
    name: "Mouse",
    price: 29.99,
    image: "/products/mouse.svg",
    description: "Precision mouse to enhance your work efficiency.",
    category: "Accessories",
    stock: 100
  },
  {
    sku: "KEY-001",
    name: "Keyboard",
    price: 59.99,
    image: "/products/keyboard.svg",
    description: "Mechanical keyboard for comfortable typing experience.",
    category: "Accessories",
    stock: 80
  }
];

const sampleUsers = [
  {
    email: "admin@test.com",
    password: "admin123",
    name: "Admin User",
    role: "admin"
  },
  {
    email: "distributor@test.com",
    password: "dist123",
    name: "Test Distributor",
    role: "distributor",
    companyName: "ABC Distribution Co.",
    defaultDiscountPercent: 15
  },
  {
    email: "distributor2@test.com",
    password: "dist123",
    name: "Premium Distributor",
    role: "distributor",
    companyName: "Premium Partners Ltd.",
    defaultDiscountPercent: 20
  },
  {
    email: "customer@test.com",
    password: "cust123",
    name: "Test Customer",
    role: "customer"
  }
];

async function main() {
  console.log("🌱 Seeding database...");

  // Delete existing data
  await prisma.product.deleteMany();
  console.log("✓ Cleared existing products");

  // Create sample users
  console.log("Creating users...");
  for (const userData of sampleUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const { password, ...userDataWithoutPassword } = userData;

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        ...userDataWithoutPassword
      },
      create: {
        ...userDataWithoutPassword,
        password: hashedPassword
      }
    });
    console.log(`✓ Created/Updated user: ${user.email} (${user.role})`);
  }

  // Add sample products
  for (const product of sampleProducts) {
    const created = await prisma.product.create({
      data: product
    });
    console.log(`✓ Created product: ${created.name}`);
  }

  console.log("✅ Seeding completed!");
}

main()
  .catch(e => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
