ALTER TABLE "Race" ADD COLUMN "sessionOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_races AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "raceDate"
      ORDER BY "raceDate" DESC, "id" ASC
    ) - 1 AS "sessionOrder"
  FROM "Race"
)
UPDATE "Race"
SET "sessionOrder" = ordered_races."sessionOrder"
FROM ordered_races
WHERE "Race"."id" = ordered_races."id";

CREATE INDEX "Race_raceDate_sessionOrder_idx" ON "Race"("raceDate", "sessionOrder");
