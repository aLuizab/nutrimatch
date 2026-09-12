-- Booking now requires the professional to accept. The time an appointment spends in
-- AWAITING_CONFIRMATION is the "tempo de resposta" signal used by the ranking.
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Appointment" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "confirmationDeadline" TIMESTAMP(3);

-- Existing appointments were created under the old auto-confirm behaviour, so they are
-- genuinely confirmed; backfill confirmedAt from createdAt (they were confirmed instantly).
UPDATE "Appointment" SET "confirmedAt" = "createdAt" WHERE "status" = 'CONFIRMED';

-- Trend dashboards group by these; neither was indexed.
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
CREATE INDEX "Appointment_createdAt_idx" ON "Appointment"("createdAt");
