/*
  Warnings:

  - Changed the type of `action` on the `StudyActionLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StudyActionType" AS ENUM ('START_ON_TIME', 'START_LATE', 'PAUSE', 'RESUME', 'TAKE_NOTE', 'END_SESSION');

-- CreateEnum
CREATE TYPE "MockTestSnapshotType" AS ENUM ('START', 'PAUSE', 'RESUME', 'SCORING', 'NOTE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('VIDEO', 'DOCUMENT', 'LINK', 'NOTE');

-- AlterTable
ALTER TABLE "StudyActionLog" DROP COLUMN "action",
ADD COLUMN     "action" "StudyActionType" NOT NULL;

-- CreateTable
CREATE TABLE "NoteImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionLogId" INTEGER NOT NULL,

    CONSTRAINT "NoteImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveMockTest" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "totalTime" INTEGER NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "lastStartedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "inputHours" INTEGER NOT NULL,
    "inputMinutes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveMockTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestSnapshot" (
    "id" SERIAL NOT NULL,
    "activeTestId" INTEGER NOT NULL,
    "type" "MockTestSnapshotType" NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTestSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestSnapshotImage" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTestSnapshotImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteImage" ADD CONSTRAINT "NoteImage_actionLogId_fkey" FOREIGN KEY ("actionLogId") REFERENCES "StudyActionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveMockTest" ADD CONSTRAINT "ActiveMockTest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestSnapshot" ADD CONSTRAINT "MockTestSnapshot_activeTestId_fkey" FOREIGN KEY ("activeTestId") REFERENCES "ActiveMockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestSnapshotImage" ADD CONSTRAINT "MockTestSnapshotImage_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MockTestSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
