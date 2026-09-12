-- Materialised weighted ranking score. Computed in application code (lib/ranking.ts) but
-- stored so Postgres can ORDER BY and paginate over it.
ALTER TABLE "Professional" ADD COLUMN "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Professional" ADD COLUMN "medianResponseSecs" INTEGER;
ALTER TABLE "Professional" ADD COLUMN "rankUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Professional_status_rankScore_idx" ON "Professional"("status", "rankScore" DESC);
