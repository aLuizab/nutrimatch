-- DropIndex
DROP INDEX "Professional_status_rankScore_idx";

-- CreateIndex
CREATE INDEX "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");
