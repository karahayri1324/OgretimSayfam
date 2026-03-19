import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subjects.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      include: { _count: { select: { teacherAssignments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        teacherAssignments: {
          include: {
            teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
            class: { select: { name: true } },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Ders bulunamadı');
    return subject;
  }

  async create(schoolId: string, dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: { ...dto, schoolId } });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findById(id);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Ders silindi' };
  }
}
