import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TakeAttendanceDto, UpdateAttendanceDto, TeacherAttendanceDto } from './dto/attendance.dto';
import { getStartOfDayInTimezone, isWeekendInTimezone, parseDateOnly } from '../../common/utils/date.utils';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async takeAttendance(schoolId: string, dto: TakeAttendanceDto) {
    const date = parseDateOnly(dto.date);
    const today = getStartOfDayInTimezone();

    if (date.getTime() > today.getTime()) {
      throw new BadRequestException('Gelecek tarihe yoklama girilemez');
    }
    if (isWeekendInTimezone(date)) {
      throw new BadRequestException('Hafta sonuna yoklama girilemez');
    }

    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      select: { schoolId: true },
    });
    if (!classRecord) throw new NotFoundException('Sınıf bulunamadı');
    if (classRecord.schoolId !== schoolId) {
      throw new ForbiddenException('Bu sınıfa erişim yetkiniz yok');
    }

    const entry = await this.prisma.timetableEntry.findUnique({
      where: { id: dto.timetableEntryId },
      select: { classId: true },
    });
    if (!entry || entry.classId !== dto.classId) {
      throw new BadRequestException('Ders programı kaydı bu sınıfa ait değil');
    }

    if (dto.students.length > 0) {
      const studentCount = await this.prisma.studentProfile.count({
        where: {
          id: { in: dto.students.map((s) => s.studentProfileId) },
          classId: dto.classId,
        },
      });
      if (studentCount !== dto.students.length) {
        throw new BadRequestException('Bazı öğrenciler bu sınıfa ait değil');
      }
    }

    return this.prisma.$transaction(
      dto.students.map((student) =>
        this.prisma.attendance.upsert({
          where: {
            studentProfileId_timetableEntryId_date: {
              studentProfileId: student.studentProfileId,
              timetableEntryId: dto.timetableEntryId,
              date,
            },
          },
          update: { status: student.status, note: student.note },
          create: {
            studentProfileId: student.studentProfileId,
            timetableEntryId: dto.timetableEntryId,
            classId: dto.classId,
            date,
            status: student.status,
            note: student.note,
          },
        }),
      ),
    );
  }

  async updateAttendance(id: string, schoolId: string, dto: UpdateAttendanceDto) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!existing) throw new NotFoundException('Yoklama kaydı bulunamadı');
    if (existing.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    return this.prisma.attendance.update({
      where: { id },
      data: { ...dto },
    });
  }

  async deleteAttendance(id: string, schoolId: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!existing) throw new NotFoundException('Yoklama kaydı bulunamadı');
    if (existing.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    return this.prisma.attendance.delete({ where: { id } });
  }

  async getByClassAndDate(classId: string, date: string, schoolId: string) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!classRecord) throw new NotFoundException('Sınıf bulunamadı');
    if (classRecord.schoolId !== schoolId) {
      throw new ForbiddenException('Bu sınıfa erişim yetkiniz yok');
    }
    return this.prisma.attendance.findMany({
      where: { classId, date: parseDateOnly(date) },
      include: {
        studentProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        timetableEntry: {
          include: {
            subject: { select: { name: true } },
            timeSlot: true,
          },
        },
      },
      orderBy: { timetableEntry: { timeSlot: { slotNumber: 'asc' } } },
    });
  }

  async getByStudent(studentProfileId: string, schoolId: string, startDate?: string, endDate?: string) {
    await this.assertStudentBelongsToSchool(studentProfileId, schoolId);
    const where: any = { studentProfileId };
    if (startDate && endDate) {
      where.date = { gte: parseDateOnly(startDate), lte: parseDateOnly(endDate) };
    }
    return this.prisma.attendance.findMany({
      where,
      include: {
        timetableEntry: {
          include: {
            subject: { select: { name: true } },
            timeSlot: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  private async assertStudentBelongsToSchool(studentProfileId: string, schoolId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    if (student.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğrenciye erişim yetkiniz yok');
    }
  }

  async getStudentStats(studentProfileId: string, schoolId: string) {
    await this.assertStudentBelongsToSchool(studentProfileId, schoolId);

    const grouped = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { studentProfileId },
      _count: { status: true },
    });

    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    let total = 0;
    for (const g of grouped) {
      const status = g.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status] = g._count.status;
      }
      total += g._count.status;
    }

    return {
      total,
      present: counts.PRESENT,
      absent: counts.ABSENT,
      late: counts.LATE,
      excused: counts.EXCUSED,
      attendanceRate: total > 0 ? (((counts.PRESENT + counts.LATE) / total) * 100).toFixed(1) : '0',
    };
  }

  async recordTeacherAttendance(schoolId: string, dto: TeacherAttendanceDto) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!teacher) throw new NotFoundException('Öğretmen bulunamadı');
    if (teacher.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğretmene erişim yetkiniz yok');
    }

    const date = parseDateOnly(dto.date);
    return this.prisma.teacherAttendance.upsert({
      where: {
        teacherProfileId_date: {
          teacherProfileId: dto.teacherProfileId,
          date,
        },
      },
      update: { isPresent: dto.isPresent, reason: dto.reason },
      create: {
        teacherProfileId: dto.teacherProfileId,
        date,
        isPresent: dto.isPresent,
        reason: dto.reason,
      },
    });
  }

  async getAbsentTeachers(schoolId: string, date: string) {
    return this.prisma.teacherAttendance.findMany({
      where: {
        date: parseDateOnly(date),
        isPresent: false,
        teacherProfile: { user: { schoolId } },
      },
      include: {
        teacherProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  async getClassAttendanceStats(classId: string, schoolId: string, startDate: string, endDate: string) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!classRecord) throw new NotFoundException('Sınıf bulunamadı');
    if (classRecord.schoolId !== schoolId) {
      throw new ForbiddenException('Bu sınıfa erişim yetkiniz yok');
    }

    const students = await this.prisma.studentProfile.findMany({
      where: { classId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const grouped = await this.prisma.attendance.groupBy({
      by: ['studentProfileId', 'status'],
      where: {
        studentProfileId: { in: students.map((s) => s.id) },
        date: { gte: parseDateOnly(startDate), lte: parseDateOnly(endDate) },
      },
      _count: { status: true },
    });

    const statsMap: Record<string, { total: number; absent: number; present: number; late: number }> = {};
    for (const g of grouped) {
      if (!statsMap[g.studentProfileId]) {
        statsMap[g.studentProfileId] = { total: 0, absent: 0, present: 0, late: 0 };
      }
      statsMap[g.studentProfileId].total += g._count.status;
      if (g.status === 'ABSENT') {
        statsMap[g.studentProfileId].absent = g._count.status;
      } else if (g.status === 'PRESENT') {
        statsMap[g.studentProfileId].present = g._count.status;
      } else if (g.status === 'LATE') {
        statsMap[g.studentProfileId].late = g._count.status;
      }
    }

    return students.map((student) => {
      const s = statsMap[student.id] || { total: 0, absent: 0, present: 0, late: 0 };
      return {
        student: { id: student.id, name: `${student.user.firstName} ${student.user.lastName}` },
        total: s.total,
        absent: s.absent,
        attendanceRate: s.total > 0 ? (((s.present + s.late) / s.total) * 100).toFixed(1) : '0',
      };
    });
  }
}
