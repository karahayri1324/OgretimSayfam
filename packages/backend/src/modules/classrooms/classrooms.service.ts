import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classrooms.dto';

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string, type?: string) {
    return this.prisma.classroom.findMany({
      where: {
        schoolId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });
    if (!classroom) throw new NotFoundException('Derslik bulunamadı');
    return classroom;
  }

  async create(schoolId: string, dto: CreateClassroomDto) {
    return this.prisma.classroom.create({
      data: { ...dto, schoolId },
    });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    await this.findById(id);
    return this.prisma.classroom.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.classroom.delete({ where: { id } });
    return { message: 'Derslik silindi' };
  }
}
