import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto, CreateGradeCategoryDto, BulkGradeEntryDto } from './dto/grades.dto';
import { parseDateOnly } from '../../common/utils/date.utils';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  private async assertStudentInSchool(studentProfileId: string, schoolId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { user: { select: { schoolId: true } } },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    if (student.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu öğrenciye erişim yetkiniz yok');
    }
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

  async createGrade(teacherProfileId: string, schoolId: string, dto: CreateGradeDto) {
    await this.assertStudentInSchool(dto.studentProfileId, schoolId);
    return this.prisma.grade.create({
      data: {
        ...dto,
        date: parseDateOnly(dto.date),
        teacherProfileId,
      },
      include: {
        studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { name: true } },
        category: { select: { name: true, code: true } },
      },
    });
  }

  async updateGrade(id: string, schoolId: string, dto: UpdateGradeDto, teacherProfileId?: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { studentProfile: { select: { user: { select: { schoolId: true } } } } },
    });
    if (!grade) throw new NotFoundException('Not bulunamadi');
    if (grade.studentProfile.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu nota erişim yetkiniz yok');
    }
    if (teacherProfileId && grade.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('Bu notu duzenleme yetkiniz yok');
    }
    return this.prisma.grade.update({
      where: { id },
      data: dto,
      include: {
        studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { name: true } },
        category: { select: { name: true, code: true } },
      },
    });
  }

  async deleteGrade(id: string, schoolId: string, teacherProfileId?: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { studentProfile: { select: { user: { select: { schoolId: true } } } } },
    });
    if (!grade) throw new NotFoundException('Not bulunamadi');
    if (grade.studentProfile.user.schoolId !== schoolId) {
      throw new ForbiddenException('Bu nota erişim yetkiniz yok');
    }
    if (teacherProfileId && grade.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('Bu notu silme yetkiniz yok');
    }
    await this.prisma.grade.delete({ where: { id } });
    return { message: 'Not silindi' };
  }

  async getParentGrades(parentProfileId: string, schoolId: string) {
    const parentStudents = await this.prisma.parentStudent.findMany({
      where: { parentId: parentProfileId, student: { user: { schoolId } } },
      include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

    const results = [];
    for (const ps of parentStudents) {
      const grades = await this.getStudentGrades(ps.studentId, schoolId);
      results.push({
        student: {
          id: ps.student.id,
          name: `${ps.student.user.firstName} ${ps.student.user.lastName}`,
        },
        grades,
      });
    }
    return results;
  }

  async getStudentGrades(studentProfileId: string, schoolId: string, termId?: string) {
    await this.assertStudentInSchool(studentProfileId, schoolId);
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

  async getClassGrades(classId: string, schoolId: string, subjectId: string, termId: string) {
    await this.assertClassInSchool(classId, schoolId);
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

  async getStudentAverage(studentProfileId: string, schoolId: string, subjectId: string, termId: string) {
    await this.assertStudentInSchool(studentProfileId, schoolId);
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

  async bulkCreateGrades(dto: BulkGradeEntryDto, teacherProfileId: string, schoolId: string) {
    if (dto.grades.length === 0) {
      throw new BadRequestException('Not girilecek öğrenci yok');
    }

    const invalidEntries = dto.grades.filter((entry) => !(entry.score >= 0 && entry.score <= 100));
    if (invalidEntries.length > 0) {
      throw new BadRequestException(
        `${invalidEntries.length} öğrencinin notu 0-100 aralığının dışında. Lütfen düzeltip tekrar deneyin.`,
      );
    }

    const studentIds = dto.grades.map((g) => g.studentProfileId);
    const inSchool = await this.prisma.studentProfile.count({
      where: { id: { in: studentIds }, user: { schoolId } },
    });
    if (inSchool !== new Set(studentIds).size) {
      throw new ForbiddenException('Bazı öğrenciler bu okula ait değil');
    }

    const date = parseDateOnly(dto.date);

    const results = await this.prisma.$transaction(
      dto.grades.map((entry) =>
        this.prisma.grade.create({
          data: {
            studentProfileId: entry.studentProfileId,
            subjectId: dto.subjectId,
            teacherProfileId,
            termId: dto.termId,
            categoryId: dto.categoryId,
            score: entry.score,
            description: dto.description,
            date,
          },
        }),
      ),
    );
    return { created: results, skipped: 0 };
  }

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
