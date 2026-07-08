-- AlterTable
ALTER TABLE "RaceResult" ADD COLUMN "position" INTEGER;

-- Backfill existing rows with a stable order per race.
WITH ranked_results AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "raceId"
            ORDER BY "bestLapMs" ASC NULLS LAST, "laps" DESC NULLS LAST, "id" ASC
        ) AS "position"
    FROM "RaceResult"
)
UPDATE "RaceResult"
SET "position" = ranked_results."position"
FROM ranked_results
WHERE "RaceResult"."id" = ranked_results."id";

ALTER TABLE "RaceResult" ALTER COLUMN "position" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_position_key" ON "RaceResult"("raceId", "position");
