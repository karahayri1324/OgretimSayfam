import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/classes.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      include: {
        _count: { select: { students: true, teacherAssignments: true } },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
  }

  async findById(id: string, schoolId?: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        teacherAssignments: {
          include: {
            teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
            subject: { select: { name: true } },
          },
        },
        _count: { select: { students: true } },
      },
    });
    if (!cls) throw new NotFoundException('Sınıf bulunamadı');
    if (schoolId && cls.schoolId !== schoolId) throw new ForbiddenException('Bu kayda erisim yetkiniz yok');
    return cls;
  }

  async create(schoolId: string, dto: CreateClassDto) {
    return this.prisma.class.create({
      data: { ...dto, schoolId },
    });
  }

  async update(id: string, dto: UpdateClassDto, schoolId?: string) {
    await this.findById(id, schoolId);
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  async delete(id: string, schoolId?: string) {
    await this.findById(id, schoolId);
    await this.prisma.class.delete({ where: { id } });
    return { message: 'Sınıf silindi' };
  }

  async addStudent(classId: string, studentProfileId: string, schoolId: string) {
    await this.findById(classId, schoolId);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    if (student.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğrenciye erişim yetkiniz yok');
    }

    await this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { classId },
    });
    return { message: 'Öğrenci sınıfa eklendi' };
  }

  async removeStudent(studentProfileId: string, schoolId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    if (student.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğrenciye erişim yetkiniz yok');
    }

    await this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { classId: null },
    });
    return { message: 'Öğrenci sınıftan çıkarıldı' };
  }
}
