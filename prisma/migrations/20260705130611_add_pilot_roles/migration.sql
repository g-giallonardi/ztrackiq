-- CreateEnum
CREATE TYPE "PilotRole" AS ENUM ('admin', 'adherent', 'visiteur');

-- AlterTable
ALTER TABLE "Pilot" ADD COLUMN     "role" "PilotRole" NOT NULL DEFAULT 'visiteur';

UPDATE "Pilot"
SET "role" = 'admin'
WHERE "id" = 1;
