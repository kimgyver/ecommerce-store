-- CreateTable
CREATE TABLE "CategoryDiscount" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryDiscount_distributorId_idx" ON "CategoryDiscount"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDiscount_distributorId_category_key" ON "CategoryDiscount"("distributorId", "category");

-- AddForeignKey
ALTER TABLE "CategoryDiscount" ADD CONSTRAINT "CategoryDiscount_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
