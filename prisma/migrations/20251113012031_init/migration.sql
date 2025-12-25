/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Garden` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Garden` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Sensor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Sensor" DROP CONSTRAINT "Sensor_gardenId_fkey";

-- AlterTable
ALTER TABLE "Garden" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "espId" TEXT NOT NULL DEFAULT '-1',
ADD COLUMN     "irrigationMode" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "Plant" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "maxAirHumidity" DOUBLE PRECISION,
ADD COLUMN     "maxSoilMoisture" DOUBLE PRECISION,
ADD COLUMN     "maxTemperature" DOUBLE PRECISION,
ADD COLUMN     "minAirHumidity" DOUBLE PRECISION,
ADD COLUMN     "minSoilMoisture" DOUBLE PRECISION,
ADD COLUMN     "minTemperature" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "username" TEXT;

-- DropTable
DROP TABLE "Sensor";

-- CreateTable
CREATE TABLE "EspDevice" (
    "espId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "airHumidity" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EspDevice_pkey" PRIMARY KEY ("espId")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3),
    "time" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "repeat" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "gardenId" INTEGER NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Garden" ADD CONSTRAINT "Garden_espId_fkey" FOREIGN KEY ("espId") REFERENCES "EspDevice"("espId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
