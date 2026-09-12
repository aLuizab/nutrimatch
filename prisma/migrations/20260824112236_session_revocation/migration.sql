-- Session revocation epoch: tokens issued before this instant are rejected, so a password
-- change logs out every other device.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
