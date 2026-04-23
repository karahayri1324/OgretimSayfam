-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_teacherProfileId_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_originalTeacherId_fkey";

-- AlterTable
ALTER TABLE "grades" ALTER COLUMN "teacherProfileId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "timetable_entries_teacherId_idx" ON "timetable_entries"("teacherId");

-- CreateIndex
CREATE INDEX "timetable_entries_subjectId_idx" ON "timetable_entries"("subjectId");

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
