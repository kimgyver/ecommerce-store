-- DropForeignKey
ALTER TABLE "DistributorPrice" DROP CONSTRAINT "DistributorPrice_distributorId_fkey";

-- AddForeignKey
ALTER TABLE "DistributorPrice" ADD CONSTRAINT "DistributorPrice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
