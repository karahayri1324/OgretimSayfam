import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto, CreateGradeCategoryDto } from './dto/grades.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async createGrade(teacherProfileId: string, dto: CreateGradeDto) {
    return this.prisma.grade.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        teacherProfileId,
      },
      include: {
        studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { name: true } },
        category: { select: { name: true, code: true } },
      },
    });
  }

  async updateGrade(id: string, dto: UpdateGradeDto) {
    return this.prisma.grade.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGrade(id: string) {
    await this.prisma.grade.delete({ where: { id } });
    return { message: 'Not silindi' };
  }

  async getStudentGrades(studentProfileId: string, termId?: string) {
    const where: any = { studentProfileId };
    if (termId) where.termId = termId;
    return this.prisma.grade.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        category: { select: { name: true, code: true, weight: true } },
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        term: { select: { name: true } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { date: 'desc' }],
    });
  }

  async getClassGrades(classId: string, subjectId: string, termId: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { classId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        grades: {
          where: { subjectId, termId },
          include: { category: { select: { name: true, code: true, weight: true } } },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
    return students;
  }

  async getStudentAverage(studentProfileId: string, subjectId: string, termId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentProfileId, subjectId, termId },
      include: { category: { select: { weight: true } } },
    });

    if (grades.length === 0) return { average: null };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const grade of grades) {
      weightedSum += grade.score * grade.category.weight;
      totalWeight += grade.category.weight;
    }

    return { average: totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : null };
  }

  // Grade Categories
  async getCategories(schoolId: string) {
    return this.prisma.gradeCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(schoolId: string, dto: CreateGradeCategoryDto) {
    return this.prisma.gradeCategory.create({
      data: { ...dto, schoolId },
    });
  }

  async createDefaultCategories(schoolId: string) {
    const defaults = [
      { name: 'Yazılı Sınav', code: 'EXAM', weight: 0.50 },
      { name: 'Sözlü', code: 'ORAL', weight: 0.20 },
      { name: 'Ödev', code: 'HOMEWORK', weight: 0.15 },
      { name: 'Performans', code: 'PERFORMANCE', weight: 0.15 },
    ];
    for (const cat of defaults) {
      await this.prisma.gradeCategory.upsert({
        where: { schoolId_code: { schoolId, code: cat.code } },
        update: cat,
        create: { ...cat, schoolId },
      });
    }
    return this.getCategories(schoolId);
  }
}
