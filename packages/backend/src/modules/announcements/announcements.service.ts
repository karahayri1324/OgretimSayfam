import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, schoolId: string, dto: CreateAnnouncementDto) {
    const { targetClassIds, targetStudentIds, publishAt, ...data } = dto;
    const announcement = await this.prisma.announcement.create({
      data: {
        ...data,
        authorId,
        schoolId,
        publishAt: publishAt ? new Date(publishAt) : undefined,
      },
    });

    if (targetClassIds && targetClassIds.length > 0) {
      await this.prisma.announcementClass.createMany({
        data: targetClassIds.map((classId) => ({
          announcementId: announcement.id,
          classId,
        })),
      });
    }

    if (targetStudentIds && targetStudentIds.length > 0) {
      await this.prisma.announcementStudent.createMany({
        data: targetStudentIds.map((studentProfileId) => ({
          announcementId: announcement.id,
          studentProfileId,
        })),
      });
    }

    return this.findById(announcement.id);
  }

  async findAll(schoolId: string, userId?: string, userRole?: string) {
    const now = new Date();
    const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN';

    const whereClause: any = { schoolId, isActive: true };

    // Filter out unpublished scheduled announcements for non-admin users
    if (!isAdmin) {
      whereClause.OR = [
        { publishAt: null },
        { publishAt: { lte: now } },
      ];
    }

    const announcements = await this.prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
        targetStudents: { select: { studentProfileId: true } },
        _count: { select: { reads: true } },
        ...(userId ? { reads: { where: { userId }, select: { id: true } } } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => ({
      ...a,
      isRead: userId ? (a as any).reads?.length > 0 : undefined,
      reads: undefined,
    }));
  }

  async findById(id: string, schoolId?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
        targetStudents: { select: { studentProfileId: true } },
        _count: { select: { reads: true } },
      },
    });
    if (!announcement) throw new NotFoundException('Duyuru bulunamadı');
    if (schoolId && announcement.schoolId !== schoolId) throw new ForbiddenException('Bu kayda erisim yetkiniz yok');
    return announcement;
  }

  async findForStudent(classId: string, schoolId: string, studentProfileId?: string) {
    const orConditions: any[] = [
      { targetClasses: { none: {} }, targetStudents: { none: {} } },
      { targetClasses: { some: { classId } } },
    ];

    if (studentProfileId) {
      orConditions.push({ targetStudents: { some: { studentProfileId } } });
    }

    return this.prisma.announcement.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { publishAt: null },
          { publishAt: { lte: new Date() } },
        ],
        AND: {
          OR: orConditions,
        },
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        targetStudents: { select: { studentProfileId: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto, schoolId?: string) {
    await this.findById(id, schoolId);
    return this.prisma.announcement.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, schoolId?: string) {
    await this.findById(id, schoolId);
    await this.prisma.announcement.delete({ where: { id } });
    return { message: 'Duyuru silindi' };
  }

  async markAsRead(announcementId: string, userId: string) {
    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: {},
      create: { announcementId, userId },
    });
    return { message: 'Okundu olarak işaretlendi' };
  }
}
