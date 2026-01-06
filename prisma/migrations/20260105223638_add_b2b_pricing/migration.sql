/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sku` to the `Product` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add sku column as nullable first
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

-- Step 2: Generate SKU for existing products based on their ID
UPDATE "Product" SET "sku" = 'PROD-' || SUBSTRING(id, 1, 8) WHERE "sku" IS NULL;

-- Step 3: Make sku NOT NULL
ALTER TABLE "Product" ALTER COLUMN "sku" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'customer';

-- CreateTable
CREATE TABLE "DistributorPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION NOT NULL,
    "discountTiers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributorPrice_productId_idx" ON "DistributorPrice"("productId");

-- CreateIndex
CREATE INDEX "DistributorPrice_distributorId_idx" ON "DistributorPrice"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorPrice_productId_distributorId_key" ON "DistributorPrice"("productId", "distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "DistributorPrice" ADD CONSTRAINT "DistributorPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPrice" ADD CONSTRAINT "DistributorPrice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
