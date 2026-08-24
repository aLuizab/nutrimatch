-- Convert single specialty to a list, preserving the existing value as the first element.
ALTER TABLE "Professional" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "Professional" SET "specialties" = ARRAY["specialty"];
ALTER TABLE "Professional" DROP COLUMN "specialty";
