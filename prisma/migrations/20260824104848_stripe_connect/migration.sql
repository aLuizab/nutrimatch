-- Stripe Connect (Express) fields. Professionals without a connected account keep working
-- exactly as before: their consultations remain arranged directly with the patient.
ALTER TABLE "Professional" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Professional" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN "stripeDisabledReason" TEXT;
ALTER TABLE "Professional" ADD COLUMN "stripeRequirementsDue" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Guards against a double-click on "connect" creating a second Stripe account and silently
-- routing money to a ghost account.
CREATE UNIQUE INDEX "Professional_stripeAccountId_key" ON "Professional"("stripeAccountId");
