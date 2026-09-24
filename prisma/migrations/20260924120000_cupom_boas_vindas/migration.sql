-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "welcomeDiscountAt" TIMESTAMP(3),
ADD COLUMN     "welcomeDiscountSeq" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_welcomeDiscountSeq_key" ON "Patient"("welcomeDiscountSeq");
