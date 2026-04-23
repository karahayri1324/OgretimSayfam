import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimeSlotDto, CreateTimetableEntryDto, BulkCreateTimetableDto } from './dto/timetable.dto';
import { isValidTimeOfDay } from '../../common/utils/date.utils';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private validateTimeSlot(dto: CreateTimeSlotDto) {
    if (!isValidTimeOfDay(dto.startTime) || !isValidTimeOfDay(dto.endTime)) {
      throw new BadRequestException('Saat HH:MM formatında (00:00 - 23:59) olmalıdır');
    }
    if (this.toMinutes(dto.startTime) >= this.toMinutes(dto.endTime)) {
      throw new BadRequestException('Başlangıç saati bitişten önce olmalıdır');
    }
    if (dto.slotNumber < 1 || dto.slotNumber > 20) {
      throw new BadRequestException('Ders saati numarası 1-20 aralığında olmalıdır');
    }
  }

  async getTimeSlots(schoolId: string) {
    return this.prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { slotNumber: 'asc' },
    });
  }

  async createTimeSlot(schoolId: string, dto: CreateTimeSlotDto) {
    this.validateTimeSlot(dto);
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

  private async assertClassInSchool(classId: string, schoolId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!cls) throw new NotFoundException('Sınıf bulunamadı');
    if (cls.schoolId !== schoolId) {
      throw new ForbiddenException('Bu sınıfa erişim yetkiniz yok');
    }
  }

  private async assertTeacherInSchool(teacherProfileId: string, schoolId: string) {
    const t = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!t) throw new NotFoundException('Öğretmen bulunamadı');
    if (t.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğretmene erişim yetkiniz yok');
    }
  }

  async getByClass(classId: string, schoolId: string) {
    await this.assertClassInSchool(classId, schoolId);
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

  async getByTeacher(teacherId: string, schoolId: string) {
    await this.assertTeacherInSchool(teacherId, schoolId);
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

  async getByClassroom(classroomId: string, schoolId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { schoolId: true },
    });
    if (!classroom) throw new NotFoundException('Derslik bulunamadı');
    if (classroom.schoolId !== schoolId) {
      throw new ForbiddenException('Bu dersliğe erişim yetkiniz yok');
    }
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

  private async assertEntryBelongsToSchool(dto: CreateTimetableEntryDto, schoolId: string) {
    const [cls, subject, slot, classroom, teacher] = await Promise.all([
      this.prisma.class.findUnique({ where: { id: dto.classId }, select: { schoolId: true } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { schoolId: true } }),
      this.prisma.timeSlot.findUnique({ where: { id: dto.timeSlotId }, select: { schoolId: true } }),
      dto.classroomId
        ? this.prisma.classroom.findUnique({ where: { id: dto.classroomId }, select: { schoolId: true } })
        : Promise.resolve(null),
      dto.teacherId
        ? this.prisma.teacherProfile.findUnique({
            where: { id: dto.teacherId },
            select: { user: { select: { schoolId: true } } },
          })
        : Promise.resolve(null),
    ]);

    if (!cls) throw new NotFoundException('Sınıf bulunamadı');
    if (!subject) throw new NotFoundException('Ders bulunamadı');
    if (!slot) throw new NotFoundException('Ders saati bulunamadı');

    const mismatches: string[] = [];
    if (cls.schoolId !== schoolId) mismatches.push('sınıf');
    if (subject.schoolId !== schoolId) mismatches.push('ders');
    if (slot.schoolId !== schoolId) mismatches.push('ders saati');
    if (dto.classroomId && classroom && classroom.schoolId !== schoolId) mismatches.push('derslik');
    if (dto.teacherId && teacher && teacher.user.schoolId !== schoolId) mismatches.push('öğretmen');

    if (mismatches.length > 0) {
      throw new ForbiddenException(`Başka okuldan ${mismatches.join(', ')} eklenemez`);
    }
  }

  private async assertNoTeacherConflict(dto: CreateTimetableEntryDto, ignoreId?: string) {
    if (!dto.teacherId) return;
    const conflict = await this.prisma.timetableEntry.findFirst({
      where: {
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        timeSlotId: dto.timeSlotId,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    });
    if (conflict) {
      throw new BadRequestException(
        `Bu öğretmen aynı gün ve saatte başka bir derste (${conflict.class.name} - ${conflict.subject.name})`,
      );
    }
  }

  async createEntry(schoolId: string, dto: CreateTimetableEntryDto) {
    await this.assertEntryBelongsToSchool(dto, schoolId);
    await this.assertNoTeacherConflict(dto);
    return this.prisma.timetableEntry.create({
      data: dto,
      include: {
        subject: { select: { name: true } },
        timeSlot: true,
        classroom: { select: { name: true } },
      },
    });
  }

  async bulkCreate(schoolId: string, dto: BulkCreateTimetableDto) {
    for (const entry of dto.entries) {
      await this.assertEntryBelongsToSchool(entry, schoolId);
    }
    return this.prisma.$transaction(
      dto.entries.map((entry) => this.prisma.timetableEntry.create({ data: entry })),
    );
  }

  async deleteEntry(id: string, schoolId: string) {
    const entry = await this.prisma.timetableEntry.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!entry) throw new NotFoundException('Ders programı kaydı bulunamadı');
    if (entry.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    await this.prisma.timetableEntry.delete({ where: { id } });
    return { message: 'Ders programı kaydı silindi' };
  }

  async clearClassTimetable(classId: string, schoolId: string) {
    await this.assertClassInSchool(classId, schoolId);
    await this.prisma.timetableEntry.deleteMany({ where: { classId } });
    return { message: 'Sınıf ders programı temizlendi' };
  }

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

  async createTeacherAssignment(
    schoolId: string,
    dto: {
      teacherProfileId: string;
      classId: string;
      subjectId: string;
      hoursPerWeek: number;
    },
  ) {
    if (!Number.isFinite(dto.hoursPerWeek) || dto.hoursPerWeek < 1 || dto.hoursPerWeek > 40) {
      throw new BadRequestException('Haftalık saat 1-40 aralığında olmalıdır');
    }
    await Promise.all([
      this.assertTeacherInSchool(dto.teacherProfileId, schoolId),
      this.assertClassInSchool(dto.classId, schoolId),
      (async () => {
        const s = await this.prisma.subject.findUnique({
          where: { id: dto.subjectId },
          select: { schoolId: true },
        });
        if (!s) throw new NotFoundException('Ders bulunamadı');
        if (s.schoolId !== schoolId) throw new ForbiddenException('Bu derse erişim yetkiniz yok');
      })(),
    ]);

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

  async deleteTeacherAssignment(id: string, schoolId: string) {
    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: { id },
      select: { teacherProfile: { select: { user: { select: { schoolId: true } } } } },
    });
    if (!assignment) throw new NotFoundException('Öğretmen ataması bulunamadı');
    if (assignment.teacherProfile.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu atamaya erişim yetkiniz yok');
    }
    await this.prisma.teacherAssignment.delete({ where: { id } });
    return { message: 'Öğretmen ataması silindi' };
  }
}
