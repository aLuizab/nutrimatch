-- CreateTable
CREATE TABLE "SentReminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentReminder_sentAt_idx" ON "SentReminder"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SentReminder_appointmentId_kind_key" ON "SentReminder"("appointmentId", "kind");
