CREATE TYPE "RaceMode" AS ENUM ('solo', 'team');
CREATE TYPE "ChampionshipMode" AS ENUM ('solo', 'team');

ALTER TABLE "Race"
ADD COLUMN "mode" "RaceMode" NOT NULL DEFAULT 'solo';

ALTER TABLE "Championship"
ADD COLUMN "mode" "ChampionshipMode" NOT NULL DEFAULT 'solo';

CREATE TABLE "RaceTeam" (
  "id" SERIAL NOT NULL,
  "raceId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RaceTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaceTeamMember" (
  "raceTeamId" INTEGER NOT NULL,
  "pilotId" INTEGER NOT NULL,

  CONSTRAINT "RaceTeamMember_pkey" PRIMARY KEY ("raceTeamId", "pilotId")
);

ALTER TABLE "RaceResult"
ADD COLUMN "teamId" INTEGER,
ALTER COLUMN "pilotId" DROP NOT NULL;

ALTER TABLE "RaceTeam"
ADD CONSTRAINT "RaceTeam_raceId_fkey"
FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RaceTeamMember"
ADD CONSTRAINT "RaceTeamMember_raceTeamId_fkey"
FOREIGN KEY ("raceTeamId") REFERENCES "RaceTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RaceTeamMember"
ADD CONSTRAINT "RaceTeamMember_pilotId_fkey"
FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RaceResult"
ADD CONSTRAINT "RaceResult_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "RaceTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RaceTeam_raceId_name_key" ON "RaceTeam"("raceId", "name");
CREATE INDEX "RaceTeam_raceId_idx" ON "RaceTeam"("raceId");
CREATE INDEX "RaceTeamMember_pilotId_idx" ON "RaceTeamMember"("pilotId");
CREATE UNIQUE INDEX "RaceResult_raceId_teamId_key" ON "RaceResult"("raceId", "teamId");
CREATE INDEX "RaceResult_teamId_idx" ON "RaceResult"("teamId");
