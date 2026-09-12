-- Separate migration: Postgres cannot use an enum value added by ALTER TYPE until that
-- statement has committed, so the default could not be set in the same migration.
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'AWAITING_CONFIRMATION';
