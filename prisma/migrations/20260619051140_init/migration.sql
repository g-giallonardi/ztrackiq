-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "chipId" TEXT,
    "basePi" INTEGER NOT NULL DEFAULT 0,
    "pilotId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spec" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "piValue" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Spec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarSpec" (
    "carId" INTEGER NOT NULL,
    "specId" INTEGER NOT NULL,

    CONSTRAINT "CarSpec_pkey" PRIMARY KEY ("carId","specId")
);

-- CreateTable
CREATE TABLE "Pilot" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Car_chipId_key" ON "Car"("chipId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecCategory_name_key" ON "SpecCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Spec_categoryId_name_key" ON "Spec"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Pilot_email_key" ON "Pilot"("email");

-- CreateIndex
CREATE INDEX "Pilot_lastname_firstname_idx" ON "Pilot"("lastname", "firstname");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spec" ADD CONSTRAINT "Spec_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpecCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarSpec" ADD CONSTRAINT "CarSpec_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarSpec" ADD CONSTRAINT "CarSpec_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
