-- CreateTable
CREATE TABLE "Race" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Race_raceDate_idx" ON "Race"("raceDate");

-- CreateIndex
CREATE INDEX "Race_status_idx" ON "Race"("status");
