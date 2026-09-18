-- AlterTable
ALTER TABLE "CarePlan" ADD COLUMN     "paymentLinkAmount" INTEGER,
ADD COLUMN     "paymentLinkUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "paymentLinkUrl" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "paymentLinkAmount" INTEGER,
ADD COLUMN     "paymentLinkUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "paymentLinkUrl" TEXT;

