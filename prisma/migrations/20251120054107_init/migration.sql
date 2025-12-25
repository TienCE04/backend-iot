-- AlterTable
ALTER TABLE "Garden" ALTER COLUMN "irrigationMode" DROP NOT NULL,
ALTER COLUMN "irrigationMode" DROP DEFAULT;

-- CreateTable
CREATE TABLE "IrrigationLog" (
    "id" SERIAL NOT NULL,
    "irrigationTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "type" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "gardenId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IrrigationLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IrrigationLog" ADD CONSTRAINT "IrrigationLog_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
