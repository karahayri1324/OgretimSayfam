import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TakeAttendanceDto, UpdateAttendanceDto, TeacherAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async takeAttendance(dto: TakeAttendanceDto) {
    const results = [];
    for (const student of dto.students) {
      const record = await this.prisma.attendance.upsert({
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
      });
      results.push(record);
    }
    return results;
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
    const total = await this.prisma.attendance.count({ where: { studentProfileId } });
    const present = await this.prisma.attendance.count({ where: { studentProfileId, status: 'PRESENT' } });
    const absent = await this.prisma.attendance.count({ where: { studentProfileId, status: 'ABSENT' } });
    const late = await this.prisma.attendance.count({ where: { studentProfileId, status: 'LATE' } });
    const excused = await this.prisma.attendance.count({ where: { studentProfileId, status: 'EXCUSED' } });

    return { total, present, absent, late, excused, attendanceRate: total > 0 ? ((present + late) / total * 100).toFixed(1) : '0' };
  }

  // Teacher Attendance
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

    const stats = [];
    for (const student of students) {
      const total = await this.prisma.attendance.count({
        where: { studentProfileId: student.id, date: { gte: new Date(startDate), lte: new Date(endDate) } },
      });
      const absent = await this.prisma.attendance.count({
        where: { studentProfileId: student.id, status: 'ABSENT', date: { gte: new Date(startDate), lte: new Date(endDate) } },
      });
      stats.push({
        student: { id: student.id, name: `${student.user.firstName} ${student.user.lastName}` },
        total, absent, attendanceRate: total > 0 ? (((total - absent) / total) * 100).toFixed(1) : '0',
      });
    }
    return stats;
  }
}
