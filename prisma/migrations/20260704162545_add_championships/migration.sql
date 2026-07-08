-- CreateTable
CREATE TABLE "Championship" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "scoringMode" TEXT NOT NULL DEFAULT 'ALL',
    "bestRaceCount" INTEGER,
    "pointsByPosition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Championship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Championship_startDate_endDate_idx" ON "Championship"("startDate", "endDate");
