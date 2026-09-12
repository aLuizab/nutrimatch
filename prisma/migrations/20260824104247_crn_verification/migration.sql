-- Audit trail for manual CRN verification against the CFN portal (no official API exists).
ALTER TABLE "Professional" ADD COLUMN "crnVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Professional" ADD COLUMN "crnVerifiedBy" TEXT;
