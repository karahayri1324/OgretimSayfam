import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubstitutionDto, UpdateSubstitutionDto } from './dto/substitutions.dto';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class SubstitutionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubstitutionDto) {
    return this.prisma.substitution.create({
      data: { ...dto, date: new Date(dto.date) },
      include: {
        timetableEntry: {
          include: {
            class: { select: { name: true } },
            subject: { select: { name: true } },
            timeSlot: true,
          },
        },
        originalTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        substituteTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async update(id: string, dto: UpdateSubstitutionDto) {
    return this.prisma.substitution.update({
      where: { id },
      data: dto,
      include: {
        timetableEntry: {
          include: { class: { select: { name: true } }, subject: { select: { name: true } }, timeSlot: true },
        },
        originalTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        substituteTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async delete(id: string) {
    await this.prisma.substitution.delete({ where: { id } });
    return { message: 'Vekil atama silindi' };
  }

  async getByDate(schoolId: string, date: string) {
    return this.prisma.substitution.findMany({
      where: {
        date: new Date(date),
        originalTeacher: { user: { schoolId } },
      },
      include: {
        timetableEntry: {
          include: { class: { select: { name: true } }, subject: { select: { name: true } }, timeSlot: true },
        },
        originalTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        substituteTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { timetableEntry: { timeSlot: { slotNumber: 'asc' } } },
    });
  }

  async getAvailableTeachers(schoolId: string, date: string, timeSlotId: string) {
    const dateObj = new Date(date);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[dateObj.getDay()] as DayOfWeek;

    // Teachers who are present and don't have a class at this time slot
    const busyTeacherIds = await this.prisma.timetableEntry.findMany({
      where: { dayOfWeek, timeSlotId, teacherId: { not: null } },
      select: { teacherId: true },
    });

    const busyIds = busyTeacherIds.map((t) => t.teacherId).filter(Boolean) as string[];

    // Also exclude teachers who are already substituting at this time
    const substitutingIds = await this.prisma.substitution.findMany({
      where: {
        date: dateObj,
        substituteTeacherId: { not: null },
        timetableEntry: { timeSlotId },
      },
      select: { substituteTeacherId: true },
    });

    const subIds = substitutingIds.map((s) => s.substituteTeacherId).filter(Boolean) as string[];
    const excludeIds = [...new Set([...busyIds, ...subIds])];

    return this.prisma.teacherProfile.findMany({
      where: {
        user: { schoolId, isActive: true },
        id: { notIn: excludeIds },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
