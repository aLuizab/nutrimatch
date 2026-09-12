-- Jitsi room per online consultation. Unique + unguessable: on public Jitsi the room name is
-- the only thing preventing a stranger from joining a health consultation.
ALTER TABLE "Appointment" ADD COLUMN "meetingRoom" TEXT;
CREATE UNIQUE INDEX "Appointment_meetingRoom_key" ON "Appointment"("meetingRoom");
