-- AlterTable
ALTER TABLE "Garden"
ADD COLUMN     "pumpStatus" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "pumpStatusMessage" TEXT,
ADD COLUMN     "lastPumpFeedbackAt" TIMESTAMP(3),
ADD COLUMN     "lastPumpSuccess" BOOLEAN;

