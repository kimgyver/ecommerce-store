import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

const sampleDistributors = [
  {
    name: "Chromet Inc.",
    emailDomain: "chromet.com",
    logoUrl: null,
    brandColor: "#FF6B35"
  },
  {
    name: "ABC Distribution Co.",
    emailDomain: "abcdist.com",
    logoUrl: null,
    brandColor: "#004E89"
  },
  {
    name: "Premium Partners Ltd.",
    emailDomain: "premiumpartners.com",
    logoUrl: null,
    brandColor: "#7209B7"
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
    email: "john@chromet.com", // Will auto-detect as Chromet distributor
    password: "dist123",
    name: "John from Chromet",
    role: "distributor"
  },
  {
    email: "sarah@abcdist.com", // Will auto-detect as ABC Distribution
    password: "dist123",
    name: "Sarah from ABC",
    role: "distributor"
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

  // Delete all data in correct order to avoid foreign key constraint errors
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓ Cleared all tables");

  // Create sample distributors
  console.log("Creating distributors...");
  const createdDistributors = [];
  for (const distData of sampleDistributors) {
    const distributor = await prisma.distributor.create({
      data: distData
    });
    createdDistributors.push(distributor);
    console.log(
      `✓ Created distributor: ${distributor.name} (${distributor.emailDomain})`
    );
  }
  console.log(`Total distributors created: ${createdDistributors.length}`);

  // Create sample users
  console.log("Creating users...");
  const createdUsers = [];
  for (const userData of sampleUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const { password, ...userDataWithoutPassword } = userData;

    // Auto-detect distributor from email domain
    const emailDomain = userData.email.split("@")[1];
    const distributor = createdDistributors.find(
      d => d.emailDomain === emailDomain
    );

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        ...userDataWithoutPassword,
        distributorId: distributor?.id || null
      },
      create: {
        ...userDataWithoutPassword,
        password: hashedPassword,
        distributorId: distributor?.id || null
      },
      include: {
        distributor: true
      }
    });
    createdUsers.push(user);
    console.log(
      `✓ Created/Updated user: ${user.email} (${user.role}${
        user.distributor ? ` - ${user.distributor.name}` : ""
      })`
    );
  }
  console.log(`Total users created: ${createdUsers.length}`);

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
  console.log(`Total products created: ${createdProducts.length}`);

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

  // Create distributor pricing
  console.log("Creating distributor pricing...");
  const chrometDistributor = createdDistributors.find(
    d => d.name === "Chromet Inc."
  );
  const abcDistributor = createdDistributors.find(
    d => d.name === "ABC Distribution Co."
  );

  if (chrometDistributor) {
    for (const { product } of createdProducts) {
      // Chromet gets 20% off
      const discountedPrice = Math.round(product.price * 0.8 * 100) / 100;

      await prisma.distributorPrice.create({
        data: {
          productId: product.id,
          distributorId: chrometDistributor.id,
          customPrice: discountedPrice,
          discountTiers: [
            { minQty: 1, maxQty: 10, price: discountedPrice },
            {
              minQty: 11,
              maxQty: 50,
              price: Math.round(product.price * 0.75 * 100) / 100
            },
            {
              minQty: 51,
              maxQty: null,
              price: Math.round(product.price * 0.7 * 100) / 100
            }
          ]
        }
      });
    }
    console.log(`✓ Created pricing for Chromet Inc. (20% base discount)`);
  }

  if (abcDistributor) {
    for (const { product } of createdProducts) {
      // ABC gets 15% off
      const discountedPrice = Math.round(product.price * 0.85 * 100) / 100;

      await prisma.distributorPrice.create({
        data: {
          productId: product.id,
          distributorId: abcDistributor.id,
          customPrice: discountedPrice,
          discountTiers: [
            { minQty: 1, maxQty: 10, price: discountedPrice },
            {
              minQty: 11,
              maxQty: 50,
              price: Math.round(product.price * 0.8 * 100) / 100
            },
            {
              minQty: 51,
              maxQty: null,
              price: Math.round(product.price * 0.75 * 100) / 100
            }
          ]
        }
      });
    }
    console.log(
      `✓ Created pricing for ABC Distribution Co. (15% base discount)`
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
