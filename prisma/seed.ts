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
    stock: 50,
    rating: 4.5,
    reviewCount: 128
  },
  {
    sku: "SW-001",
    name: "Smartwatch",
    price: 199.99,
    image: "/products/smartwatch.svg",
    description: "Stylish smartwatch with modern design and features",
    category: "Electronics",
    stock: 30,
    rating: 4.7,
    reviewCount: 89
  },
  {
    sku: "CAM-001",
    name: "Camera",
    price: 599.99,
    image: "/products/camera.svg",
    description: "Professional-grade camera to capture perfect moments.",
    category: "Electronics",
    stock: 15,
    rating: 4.9,
    reviewCount: 234
  },
  {
    sku: "LAP-001",
    name: "Laptop",
    price: 1299.99,
    image: "/products/laptop.svg",
    description: "High-performance laptop to boost your productivity.",
    category: "Computers",
    stock: 20,
    rating: 4.6,
    reviewCount: 156
  },
  {
    sku: "MOU-001",
    name: "Mouse",
    price: 29.99,
    image: "/products/mouse.svg",
    description: "Precision mouse to enhance your work efficiency.",
    category: "Accessories",
    stock: 100,
    rating: 4.3,
    reviewCount: 67
  },
  {
    sku: "KEY-001",
    name: "Keyboard",
    price: 59.99,
    image: "/products/keyboard.svg",
    description: "Mechanical keyboard for comfortable typing experience.",
    category: "Accessories",
    stock: 80,
    rating: 4.8,
    reviewCount: 203
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
  const createdUsers = [];
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
    createdUsers.push(user);
    console.log(`✓ Created/Updated user: ${user.email} (${user.role})`);
  }

  // Add sample products
  const createdProducts = [];
  for (const product of sampleProducts) {
    const { rating, reviewCount, ...productData } = product;
    const created = await prisma.product.create({
      data: productData
    });
    createdProducts.push({
      product: created,
      targetRating: rating,
      targetReviewCount: reviewCount
    });
    console.log(`✓ Created product: ${created.name}`);
  }

  // Create sample reviews
  console.log("Creating sample reviews...");
  const reviewTitles = [
    "Excellent product!",
    "Great quality",
    "Highly recommended",
    "Good value for money",
    "Amazing purchase",
    "Very satisfied",
    "Perfect for my needs",
    "Exceeded expectations",
    "Worth every penny",
    "Love it!"
  ];

  const reviewContents = [
    "This product exceeded all my expectations. The quality is outstanding and it works perfectly.",
    "I've been using this for a few weeks now and I'm very impressed with the build quality and performance.",
    "Great purchase! Does exactly what it's supposed to do. Would definitely recommend to others.",
    "The product arrived quickly and was exactly as described. Very happy with this purchase.",
    "Outstanding quality and attention to detail. This is definitely worth the investment.",
    "I did a lot of research before buying and this was the best choice. No regrets!",
    "Fantastic product that delivers on all its promises. Customer service was also excellent.",
    "This has made such a difference in my daily routine. Couldn't be happier with it.",
    "High quality materials and great design. This is exactly what I was looking for.",
    "Best purchase I've made in a long time. Highly recommend to anyone considering it."
  ];

  for (const { product, targetRating, targetReviewCount } of createdProducts) {
    // Use smaller number for faster seeding (max 20 reviews, but show original count)
    const numReviews = Math.min(targetReviewCount || 10, 20);

    // Generate random ratings that average to the target
    const ratings = [];
    for (let i = 0; i < numReviews; i++) {
      // Create ratings clustered around the target rating
      const variance = Math.random() * 2 - 1; // -1 to +1
      let rating = Math.round(targetRating + variance);
      rating = Math.max(1, Math.min(5, rating)); // Clamp between 1-5
      ratings.push(rating);
    }

    // Adjust ratings to match target average more closely
    const currentAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const diff = targetRating - currentAvg;
    if (Math.abs(diff) > 0.1) {
      // Adjust the first rating to correct the average
      ratings[0] = Math.max(
        1,
        Math.min(5, Math.round(ratings[0] + diff * numReviews))
      );
    }

    // Prepare reviews for bulk creation
    const reviewsToCreate = [];
    for (let i = 0; i < numReviews; i++) {
      const randomUser =
        createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const randomTitleIndex = Math.floor(Math.random() * reviewTitles.length);
      const randomContentIndex = Math.floor(
        Math.random() * reviewContents.length
      );

      reviewsToCreate.push({
        userId: randomUser.id,
        productId: product.id,
        rating: ratings[i],
        title: reviewTitles[randomTitleIndex],
        content: reviewContents[randomContentIndex]
      });
    }

    // Bulk create all reviews at once (much faster)
    await prisma.review.createMany({
      data: reviewsToCreate
    });

    // Calculate average rating
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Update product with actual average but keep target reviewCount for display
    await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: targetReviewCount // Show original target count
      }
    });

    console.log(
      `✓ Created ${numReviews} reviews for ${product.name} (avg rating: ${
        Math.round(avgRating * 10) / 10
      }, displaying as ${targetReviewCount} reviews)`
    );
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
