import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDiaryDto, UpdateClassDiaryDto } from './dto/class-diary.dto';

@Injectable()
export class ClassDiaryService {
  constructor(private prisma: PrismaService) {}

  async create(teacherProfileId: string, dto: CreateClassDiaryDto) {
    return this.prisma.classDiaryEntry.create({
      data: { ...dto, date: new Date(dto.date), teacherProfileId },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
    });
  }

  async update(id: string, dto: UpdateClassDiaryDto) {
    const entry = await this.prisma.classDiaryEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Sınıf defteri kaydı bulunamadı');
    return this.prisma.classDiaryEntry.update({ where: { id }, data: dto });
  }

  async getByClassAndDate(classId: string, date: string) {
    return this.prisma.classDiaryEntry.findMany({
      where: { classId, date: new Date(date) },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
      orderBy: { timetableEntry: { timeSlot: { slotNumber: 'asc' } } },
    });
  }

  async getByClassDateRange(classId: string, startDate: string, endDate: string) {
    return this.prisma.classDiaryEntry.findMany({
      where: {
        classId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: {
        subject: { select: { name: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        timetableEntry: { include: { timeSlot: true } },
      },
      orderBy: [{ date: 'asc' }, { timetableEntry: { timeSlot: { slotNumber: 'asc' } } }],
    });
  }

  async delete(id: string) {
    const entry = await this.prisma.classDiaryEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Kayıt bulunamadı');
    return this.prisma.classDiaryEntry.delete({ where: { id } });
  }

  async approve(id: string) {
    const entry = await this.prisma.classDiaryEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Sınıf defteri kaydı bulunamadı');
    return this.prisma.classDiaryEntry.update({
      where: { id },
      data: { isApproved: true },
    });
  }
}
