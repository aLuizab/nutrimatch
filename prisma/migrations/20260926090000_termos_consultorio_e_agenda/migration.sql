
-- CreateEnum
CREATE TYPE "AgendaEntryKind" AS ENUM ('CONSULTA_EXTERNA', 'COMPROMISSO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "officeAddress" TEXT;

-- CreateTable
CREATE TABLE "AgendaEntry" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "kind" "AgendaEntryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "modality" "Modality",
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaEntry_professionalId_startsAt_idx" ON "AgendaEntry"("professionalId", "startsAt");

-- AddForeignKey
ALTER TABLE "AgendaEntry" ADD CONSTRAINT "AgendaEntry_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

