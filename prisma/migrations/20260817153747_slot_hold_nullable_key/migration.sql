-- Cancelled appointments must free their slot. The old unique index covered scheduledAt
-- directly and does not distinguish CANCELLED from CONFIRMED, so a cancelled appointment
-- permanently blocked rebooking that time. Postgres unique indexes treat NULL as distinct,
-- so a nullable mirror column (null once cancelled) fixes this without touching scheduledAt,
-- which stays intact for history.
ALTER TABLE "Appointment" ADD COLUMN "slotHeldAt" TIMESTAMP(3);
UPDATE "Appointment" SET "slotHeldAt" = "scheduledAt" WHERE "status" = 'CONFIRMED';

DROP INDEX "Appointment_professionalId_scheduledAt_key";
CREATE UNIQUE INDEX "Appointment_professionalId_slotHeldAt_key" ON "Appointment"("professionalId", "slotHeldAt");
