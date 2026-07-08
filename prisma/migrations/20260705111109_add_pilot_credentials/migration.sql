/*
  Warnings:

  - Made the column `email` on table `Pilot` required. This step will fail if there are existing NULL values in that column.

*/
UPDATE "Pilot"
SET "email" = CONCAT('pilot-', "id", '@ztrackiq.local')
WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "Pilot" ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT 'sha256:e7cd9662965741e20f58915fb0eb0f52696c786c0529d02c316db538bd6ead99',
ALTER COLUMN "email" SET NOT NULL;
