/*
  Warnings:

  - You are about to drop the column `defaultDiscountPercent` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CategoryDiscount" DROP CONSTRAINT "CategoryDiscount_distributorId_fkey";

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "defaultDiscountPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "defaultDiscountPercent";

-- AddForeignKey
ALTER TABLE "CategoryDiscount" ADD CONSTRAINT "CategoryDiscount_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
