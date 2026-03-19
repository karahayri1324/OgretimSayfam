import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, schoolId: string, dto: CreateAnnouncementDto) {
    const { targetClassIds, ...data } = dto;
    const announcement = await this.prisma.announcement.create({
      data: { ...data, authorId, schoolId },
    });

    if (targetClassIds && targetClassIds.length > 0) {
      await this.prisma.announcementClass.createMany({
        data: targetClassIds.map((classId) => ({
          announcementId: announcement.id,
          classId,
        })),
      });
    }

    return this.findById(announcement.id);
  }

  async findAll(schoolId: string, userId?: string) {
    const announcements = await this.prisma.announcement.findMany({
      where: { schoolId, isActive: true },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
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

  async findById(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        targetClasses: { include: { class: { select: { name: true } } } },
        _count: { select: { reads: true } },
      },
    });
    if (!announcement) throw new NotFoundException('Duyuru bulunamadı');
    return announcement;
  }

  async findForStudent(classId: string, schoolId: string) {
    return this.prisma.announcement.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { targetClasses: { none: {} } },
          { targetClasses: { some: { classId } } },
        ],
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    return this.prisma.announcement.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
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
