import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDiaryDto, UpdateClassDiaryDto } from './dto/class-diary.dto';
import { parseDateOnly } from '../../common/utils/date.utils';

@Injectable()
export class ClassDiaryService {
  constructor(private prisma: PrismaService) {}

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

  async create(teacherProfileId: string, schoolId: string, dto: CreateClassDiaryDto) {
    await this.assertClassInSchool(dto.classId, schoolId);

    const entry = await this.prisma.timetableEntry.findUnique({
      where: { id: dto.timetableEntryId },
      select: { classId: true, teacherId: true },
    });
    if (!entry) throw new NotFoundException('Ders programı kaydı bulunamadı');
    if (entry.classId !== dto.classId) {
      throw new BadRequestException('Ders programı kaydı bu sınıfa ait değil');
    }
    if (entry.teacherId && entry.teacherId !== teacherProfileId) {
      throw new ForbiddenException('Bu dersin öğretmeni siz değilsiniz');
    }

    return this.prisma.classDiaryEntry.create({
      data: { ...dto, date: parseDateOnly(dto.date), teacherProfileId },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
    });
  }

  async update(id: string, schoolId: string, dto: UpdateClassDiaryDto, teacherProfileId?: string) {
    const entry = await this.prisma.classDiaryEntry.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!entry) throw new NotFoundException('Sınıf defteri kaydı bulunamadı');
    if (entry.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    if (teacherProfileId && entry.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('Bu kaydı düzenleme yetkiniz yok');
    }
    return this.prisma.classDiaryEntry.update({ where: { id }, data: dto });
  }

  async getByClassAndDate(classId: string, date: string, schoolId: string) {
    await this.assertClassInSchool(classId, schoolId);
    return this.prisma.classDiaryEntry.findMany({
      where: { classId, date: parseDateOnly(date) },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
      orderBy: { timetableEntry: { timeSlot: { slotNumber: 'asc' } } },
    });
  }

  async getByClassDateRange(classId: string, schoolId: string, startDate: string, endDate: string) {
    await this.assertClassInSchool(classId, schoolId);
    return this.prisma.classDiaryEntry.findMany({
      where: {
        classId,
        date: { gte: parseDateOnly(startDate), lte: parseDateOnly(endDate) },
      },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
      orderBy: [{ date: 'asc' }, { timetableEntry: { timeSlot: { slotNumber: 'asc' } } }],
    });
  }

  async delete(id: string, schoolId: string, teacherProfileId?: string) {
    const entry = await this.prisma.classDiaryEntry.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!entry) throw new NotFoundException('Kayıt bulunamadı');
    if (entry.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    if (teacherProfileId && entry.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('Bu kaydı silme yetkiniz yok');
    }
    return this.prisma.classDiaryEntry.delete({ where: { id } });
  }

  async approve(id: string, schoolId: string) {
    const entry = await this.prisma.classDiaryEntry.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });
    if (!entry) throw new NotFoundException('Sınıf defteri kaydı bulunamadı');
    if (entry.class.schoolId !== schoolId) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    return this.prisma.classDiaryEntry.update({
      where: { id },
      data: { isApproved: true },
    });
  }
}
