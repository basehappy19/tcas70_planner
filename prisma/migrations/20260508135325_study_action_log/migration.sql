/*
  Warnings:

  - You are about to drop the column `createdAt` on the `StudyLog` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `StudyLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudyLog" DROP COLUMN "createdAt",
DROP COLUMN "notes",
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "actualStartAt" DROP NOT NULL,
ALTER COLUMN "delayMinutes" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "StudyActionLog" (
    "id" SERIAL NOT NULL,
    "studyLogId" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "StudyActionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudyActionLog" ADD CONSTRAINT "StudyActionLog_studyLogId_fkey" FOREIGN KEY ("studyLogId") REFERENCES "StudyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
