const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sampleProducts = [
  {
    name: "Wireless Headphones",
    price: 79.99,
    image: "/products/headphones.svg",
    description:
      "Experience perfect sound with our high-quality wireless headphones.",
    category: "Electronics",
    stock: 50
  },
  {
    name: "Smartwatch",
    price: 199.99,
    image: "/products/smartwatch.svg",
    description: "Stylish smartwatch with modern design and features",
    category: "Electronics",
    stock: 30
  },
  {
    name: "Camera",
    price: 599.99,
    image: "/products/camera.svg",
    description: "Professional-grade camera to capture perfect moments.",
    category: "Electronics",
    stock: 15
  },
  {
    name: "Laptop",
    price: 1299.99,
    image: "/products/laptop.svg",
    description: "High-performance laptop to boost your productivity.",
    category: "Computers",
    stock: 20
  },
  {
    name: "Mouse",
    price: 29.99,
    image: "/products/mouse.svg",
    description: "Precision mouse to enhance your work efficiency.",
    category: "Accessories",
    stock: 100
  },
  {
    name: "Keyboard",
    price: 59.99,
    image: "/products/keyboard.svg",
    description: "Mechanical keyboard for comfortable typing experience.",
    category: "Accessories",
    stock: 80
  }
];

async function main() {
  console.log("🌱 Seeding database...");

  // Delete existing data
  await prisma.product.deleteMany();
  console.log("✓ Cleared existing products");

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
