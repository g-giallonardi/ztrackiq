-- CreateTable
CREATE TABLE "Track" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_name_key" ON "Track"("name");

-- CreateIndex
CREATE INDEX "Track_name_idx" ON "Track"("name");

-- AlterTable
ALTER TABLE "Race" ADD COLUMN "trackId" INTEGER;

-- Backfill tracks from existing location values.
INSERT INTO "Track" ("name", "createdAt", "updatedAt")
SELECT DISTINCT TRIM("location"), NOW(), NOW()
FROM "Race"
WHERE "location" IS NOT NULL AND TRIM("location") <> ''
ON CONFLICT ("name") DO NOTHING;

UPDATE "Race"
SET "trackId" = "Track"."id"
FROM "Track"
WHERE TRIM("Race"."location") = "Track"."name";

-- CreateIndex
CREATE INDEX "Race_trackId_idx" ON "Race"("trackId");

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
