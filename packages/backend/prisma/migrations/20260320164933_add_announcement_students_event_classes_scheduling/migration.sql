-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "startTime" TEXT;

-- CreateTable
CREATE TABLE "announcement_students" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,

    CONSTRAINT "announcement_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_classes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "event_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "announcement_students_announcementId_studentProfileId_key" ON "announcement_students"("announcementId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "event_classes_eventId_classId_key" ON "event_classes"("eventId", "classId");

-- AddForeignKey
ALTER TABLE "announcement_students" ADD CONSTRAINT "announcement_students_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_classes" ADD CONSTRAINT "event_classes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_classes" ADD CONSTRAINT "event_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
