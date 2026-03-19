import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto, UpdateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from './dto/assignments.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto) {
    return this.prisma.assignment.create({
      data: { ...dto, dueDate: new Date(dto.dueDate) },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    });
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    return this.prisma.assignment.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.assignment.delete({ where: { id } });
    return { message: 'Ödev silindi' };
  }

  async getByClass(classId: string, subjectId?: string) {
    const where: any = { classId };
    if (subjectId) where.subjectId = subjectId;
    return this.prisma.assignment.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getById(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        submissions: {
          include: {
            studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Ödev bulunamadı');
    return assignment;
  }

  async submit(assignmentId: string, studentProfileId: string, dto: SubmitAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Ödev bulunamadı');

    const isLate = new Date() > assignment.dueDate;

    return this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentProfileId: { assignmentId, studentProfileId } },
      update: { ...dto, status: isLate ? 'LATE' : 'SUBMITTED', submittedAt: new Date() },
      create: {
        assignmentId, studentProfileId,
        ...dto,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { ...dto, status: 'GRADED', gradedAt: new Date() },
    });
  }

  async getStudentAssignments(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { classId: true },
    });
    if (!student?.classId) return [];

    return this.prisma.assignment.findMany({
      where: { classId: student.classId },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        submissions: { where: { studentProfileId } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getTeacherAssignments(teacherProfileId: string) {
    // Find all classes/subjects this teacher is assigned to
    const teacherAssignments = await this.prisma.teacherAssignment.findMany({
      where: { teacherProfileId },
      select: { classId: true, subjectId: true },
    });

    if (teacherAssignments.length === 0) return [];

    const classIds = [...new Set(teacherAssignments.map(ta => ta.classId))];
    const subjectIds = [...new Set(teacherAssignments.map(ta => ta.subjectId))];

    return this.prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
        subjectId: { in: subjectIds },
      },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getSubmissions(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: {
            students: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        submissions: {
          include: {
            studentProfile: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Ödev bulunamadı');

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
      },
      totalStudents: assignment.class.students.length,
      submissions: assignment.submissions,
    };
  }
}
