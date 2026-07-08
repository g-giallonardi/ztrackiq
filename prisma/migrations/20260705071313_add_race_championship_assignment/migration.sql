-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "championshipId" INTEGER;

-- CreateIndex
CREATE INDEX "Race_championshipId_idx" ON "Race"("championshipId");

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
