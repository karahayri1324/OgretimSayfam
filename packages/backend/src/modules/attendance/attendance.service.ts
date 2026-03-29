import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TakeAttendanceDto, UpdateAttendanceDto, TeacherAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async takeAttendance(dto: TakeAttendanceDto) {
    return this.prisma.$transaction(
      dto.students.map(student =>
        this.prisma.attendance.upsert({
          where: {
            studentProfileId_timetableEntryId_date: {
              studentProfileId: student.studentProfileId,
              timetableEntryId: dto.timetableEntryId,
              date: new Date(dto.date),
            },
          },
          update: { status: student.status, note: student.note },
          create: {
            studentProfileId: student.studentProfileId,
            timetableEntryId: dto.timetableEntryId,
            classId: dto.classId,
            date: new Date(dto.date),
            status: student.status,
            note: student.note,
          },
        }),
      ),
    );
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Yoklama kaydı bulunamadı');
    return this.prisma.attendance.update({
      where: { id },
      data: { ...dto },
    });
  }

  async deleteAttendance(id: string) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Yoklama kaydı bulunamadı');
    return this.prisma.attendance.delete({ where: { id } });
  }

  async getByClassAndDate(classId: string, date: string) {
    return this.prisma.attendance.findMany({
      where: { classId, date: new Date(date) },
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

  async getByStudent(studentProfileId: string, startDate?: string, endDate?: string) {
    const where: any = { studentProfileId };
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
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

  async getStudentStats(studentProfileId: string) {
    
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

  async recordTeacherAttendance(dto: TeacherAttendanceDto) {
    return this.prisma.teacherAttendance.upsert({
      where: {
        teacherProfileId_date: {
          teacherProfileId: dto.teacherProfileId,
          date: new Date(dto.date),
        },
      },
      update: { isPresent: dto.isPresent, reason: dto.reason },
      create: {
        teacherProfileId: dto.teacherProfileId,
        date: new Date(dto.date),
        isPresent: dto.isPresent,
        reason: dto.reason,
      },
    });
  }

  async getAbsentTeachers(schoolId: string, date: string) {
    return this.prisma.teacherAttendance.findMany({
      where: {
        date: new Date(date),
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

  async getClassAttendanceStats(classId: string, startDate: string, endDate: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { classId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const grouped = await this.prisma.attendance.groupBy({
      by: ['studentProfileId', 'status'],
      where: {
        studentProfileId: { in: students.map((s) => s.id) },
        date: { gte: new Date(startDate), lte: new Date(endDate) },
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
