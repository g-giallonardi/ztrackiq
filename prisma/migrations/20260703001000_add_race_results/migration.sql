-- CreateTable
CREATE TABLE "RaceResult" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "pilotId" INTEGER NOT NULL,
    "laps" INTEGER,
    "bestLapMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_pilotId_key" ON "RaceResult"("raceId", "pilotId");

-- CreateIndex
CREATE INDEX "RaceResult_pilotId_idx" ON "RaceResult"("pilotId");

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
