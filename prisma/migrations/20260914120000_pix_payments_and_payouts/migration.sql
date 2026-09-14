-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_REVIEW';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "pixClaimNote" TEXT,
ADD COLUMN     "pixClaimedAt" TIMESTAMP(3),
ADD COLUMN     "pixReviewedAt" TIMESTAMP(3),
ADD COLUMN     "pixReviewedBy" TEXT,
ADD COLUMN     "pixTxid" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "pixClaimNote" TEXT,
ADD COLUMN     "pixClaimedAt" TIMESTAMP(3),
ADD COLUMN     "pixReviewedAt" TIMESTAMP(3),
ADD COLUMN     "pixReviewedBy" TEXT,
ADD COLUMN     "pixTxid" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixKeyType" TEXT;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "pixKeySnapshot" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_appointmentId_key" ON "Payout"("appointmentId");

-- CreateIndex
CREATE INDEX "Payout_professionalId_status_idx" ON "Payout"("professionalId", "status");

-- CreateIndex
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_pixTxid_key" ON "Appointment"("pixTxid");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_pixTxid_key" ON "Enrollment"("pixTxid");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

