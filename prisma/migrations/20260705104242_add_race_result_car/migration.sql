-- AlterTable
ALTER TABLE "RaceResult" ADD COLUMN     "carId" INTEGER;

-- CreateIndex
CREATE INDEX "RaceResult_carId_idx" ON "RaceResult"("carId");

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
