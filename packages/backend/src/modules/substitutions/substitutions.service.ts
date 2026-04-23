import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubstitutionDto, UpdateSubstitutionDto } from './dto/substitutions.dto';
import { getDayOfWeekInTimezone, getStartOfDayInTimezone, parseDateOnly } from '../../common/utils/date.utils';

@Injectable()
export class SubstitutionsService {
  constructor(private prisma: PrismaService) {}

  private async assertEntryBelongsToSchool(timetableEntryId: string, schoolId: string) {
    const entry = await this.prisma.timetableEntry.findUnique({
      where: { id: timetableEntryId },
      select: { class: { select: { schoolId: true } } },
    });
    if (!entry) throw new NotFoundException('Ders programı kaydı bulunamadı');
    if (entry.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu ders kaydına erişim yetkiniz yok');
    }
  }

  private async assertTeacherBelongsToSchool(teacherProfileId: string, schoolId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!teacher) throw new NotFoundException('Öğretmen bulunamadı');
    if (teacher.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğretmene erişim yetkiniz yok');
    }
  }

  async create(schoolId: string, dto: CreateSubstitutionDto) {
    if (dto.substituteTeacherId && dto.substituteTeacherId === dto.originalTeacherId) {
      throw new BadRequestException('Bir öğretmen kendisine vekil atanamaz');
    }

    await this.assertEntryBelongsToSchool(dto.timetableEntryId, schoolId);
    await this.assertTeacherBelongsToSchool(dto.originalTeacherId, schoolId);
    if (dto.substituteTeacherId) {
      await this.assertTeacherBelongsToSchool(dto.substituteTeacherId, schoolId);
    }

    const date = parseDateOnly(dto.date);
    const today = getStartOfDayInTimezone();
    if (date.getTime() < today.getTime()) {
      throw new BadRequestException('Geçmiş tarihe vekil atama yapılamaz');
    }

    return this.prisma.substitution.create({
      data: { ...dto, date },
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

  async update(id: string, schoolId: string, dto: UpdateSubstitutionDto) {
    const existing = await this.prisma.substitution.findUnique({
      where: { id },
      include: { originalTeacher: { select: { userId: true, user: { select: { schoolId: true } } } } },
    });
    if (!existing) throw new NotFoundException('Vekil atama bulunamadı');
    if (existing.originalTeacher.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu vekil atamaya erişim yetkiniz yok');
    }

    if (dto.substituteTeacherId) {
      if (dto.substituteTeacherId === existing.originalTeacherId) {
        throw new BadRequestException('Bir öğretmen kendisine vekil atanamaz');
      }
      await this.assertTeacherBelongsToSchool(dto.substituteTeacherId, schoolId);
    }

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

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.substitution.findUnique({
      where: { id },
      include: { originalTeacher: { select: { user: { select: { schoolId: true } } } } },
    });
    if (!existing) throw new NotFoundException('Vekil atama bulunamadı');
    if (existing.originalTeacher.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu vekil atamaya erişim yetkiniz yok');
    }
    await this.prisma.substitution.delete({ where: { id } });
    return { message: 'Vekil atama silindi' };
  }

  async getByDate(schoolId: string, date: string) {
    return this.prisma.substitution.findMany({
      where: {
        date: parseDateOnly(date),
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
    let dateObj: Date;
    try {
      dateObj = parseDateOnly(date);
    } catch {
      throw new BadRequestException('Geçersiz tarih formatı');
    }
    const dayOfWeek = getDayOfWeekInTimezone(dateObj);

    const busyTeacherIds = await this.prisma.timetableEntry.findMany({
      where: { dayOfWeek, timeSlotId, teacherId: { not: null } },
      select: { teacherId: true },
    });

    const busyIds = busyTeacherIds.map((t) => t.teacherId).filter(Boolean) as string[];

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
