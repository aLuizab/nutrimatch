-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'ATTENDED', 'NO_SHOW', 'CONTESTED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "attendanceContestedAt" TIMESTAMP(3),
ADD COLUMN     "attendanceMarkedAt" TIMESTAMP(3),
ADD COLUMN     "attendanceNote" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" "Role";

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "fulfilledCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'NOVO';
