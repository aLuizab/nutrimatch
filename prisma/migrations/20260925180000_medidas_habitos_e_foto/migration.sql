
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarFileId" TEXT;

-- AlterTable
ALTER TABLE "ProgressEntry" ADD COLUMN     "armCm" DOUBLE PRECISION,
ADD COLUMN     "bodyFatPercent" DOUBLE PRECISION,
ADD COLUMN     "chestCm" DOUBLE PRECISION,
ADD COLUMN     "hipCm" DOUBLE PRECISION,
ADD COLUMN     "leanMassKg" DOUBLE PRECISION,
ADD COLUMN     "thighCm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetPerWeek" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_patientId_active_idx" ON "Habit"("patientId", "active");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_date_idx" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarFileId_key" ON "User"("avatarFileId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

