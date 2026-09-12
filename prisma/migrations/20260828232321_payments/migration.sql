-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'AUTHORIZED', 'PAID', 'VOIDED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "checkoutSessionId" TEXT,
ADD COLUMN     "feeCents" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentDeadline" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "checkoutSessionId" TEXT,
ADD COLUMN     "feeCents" INTEGER,
ADD COLUMN     "paidAmountCents" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_paymentIntentId_key" ON "Appointment"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_checkoutSessionId_key" ON "Appointment"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_paymentIntentId_key" ON "Enrollment"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_checkoutSessionId_key" ON "Enrollment"("checkoutSessionId");

