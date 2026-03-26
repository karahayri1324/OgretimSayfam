import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimeSlotDto, CreateTimetableEntryDto, BulkCreateTimetableDto } from './dto/timetable.dto';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  // Time Slots
  async getTimeSlots(schoolId: string) {
    return this.prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { slotNumber: 'asc' },
    });
  }

  async createTimeSlot(schoolId: string, dto: CreateTimeSlotDto) {
    return this.prisma.timeSlot.create({
      data: { ...dto, schoolId },
    });
  }

  async createDefaultTimeSlots(schoolId: string) {
    const defaults = [
      { slotNumber: 1, startTime: '08:30', endTime: '09:10' },
      { slotNumber: 2, startTime: '09:20', endTime: '10:00' },
      { slotNumber: 3, startTime: '10:10', endTime: '10:50' },
      { slotNumber: 4, startTime: '11:00', endTime: '11:40' },
      { slotNumber: 5, startTime: '11:50', endTime: '12:30' },
      { slotNumber: 6, startTime: '13:10', endTime: '13:50' },
      { slotNumber: 7, startTime: '14:00', endTime: '14:40' },
      { slotNumber: 8, startTime: '14:50', endTime: '15:30' },
    ];

    for (const slot of defaults) {
      await this.prisma.timeSlot.upsert({
        where: { schoolId_slotNumber: { schoolId, slotNumber: slot.slotNumber } },
        update: slot,
        create: { ...slot, schoolId },
      });
    }
    return this.getTimeSlots(schoolId);
  }

  // Timetable Entries
  async getByClass(classId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { classId },
      include: {
        subject: { select: { name: true, code: true, color: true } },
        timeSlot: true,
        classroom: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { slotNumber: 'asc' } }],
    });
  }

  async getByTeacher(teacherId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { teacherId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true, color: true } },
        timeSlot: true,
        classroom: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { slotNumber: 'asc' } }],
    });
  }

  async getByClassroom(classroomId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { classroomId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        timeSlot: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { slotNumber: 'asc' } }],
    });
  }

  async createEntry(dto: CreateTimetableEntryDto) {
    return this.prisma.timetableEntry.create({
      data: dto,
      include: {
        subject: { select: { name: true } },
        timeSlot: true,
        classroom: { select: { name: true } },
      },
    });
  }

  async bulkCreate(dto: BulkCreateTimetableDto) {
    return this.prisma.$transaction(
      dto.entries.map(entry =>
        this.prisma.timetableEntry.create({ data: entry }),
      ),
    );
  }

  async deleteEntry(id: string) {
    await this.prisma.timetableEntry.delete({ where: { id } });
    return { message: 'Ders programı kaydı silindi' };
  }

  async clearClassTimetable(classId: string) {
    await this.prisma.timetableEntry.deleteMany({ where: { classId } });
    return { message: 'Sınıf ders programı temizlendi' };
  }

  // Teacher Assignments
  async getTeacherAssignments(schoolId: string) {
    return this.prisma.teacherAssignment.findMany({
      where: {
        teacherProfile: { user: { schoolId } },
      },
      include: {
        teacherProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
  }

  async createTeacherAssignment(dto: {
    teacherProfileId: string;
    classId: string;
    subjectId: string;
    hoursPerWeek: number;
  }) {
    return this.prisma.teacherAssignment.create({
      data: dto,
      include: {
        teacherProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
  }

  async deleteTeacherAssignment(id: string) {
    await this.prisma.teacherAssignment.delete({ where: { id } });
    return { message: 'Öğretmen ataması silindi' };
  }
}
