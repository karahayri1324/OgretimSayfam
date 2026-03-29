import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createdById: string, dto: CreateEventDto) {
    const { targetClassIds, ...rest } = dto;
    const event = await this.prisma.event.create({
      data: {
        ...rest,
        startDate: new Date(rest.startDate),
        endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        schoolId,
        createdById,
      },
    });

    if (targetClassIds && targetClassIds.length > 0) {
      await this.prisma.eventClass.createMany({
        data: targetClassIds.map((classId) => ({
          eventId: event.id,
          classId,
        })),
      });
    }

    return this.findById(event.id);
  }

  async findAll(schoolId: string) {
    return this.prisma.event.findMany({
      where: { schoolId, isActive: true },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
        _count: { select: { participants: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string, schoolId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
        participants: true,
      },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    if (schoolId && event.schoolId !== schoolId) throw new ForbiddenException('Bu kayda erisim yetkiniz yok');
    return event;
  }

  async update(id: string, dto: UpdateEventDto, schoolId?: string) {
    await this.findById(id, schoolId);
    const { targetClassIds, ...rest } = dto;
    const data: any = { ...rest };
    if (rest.startDate) data.startDate = new Date(rest.startDate);
    if (rest.endDate) data.endDate = new Date(rest.endDate);

    const event = await this.prisma.event.update({ where: { id }, data });

    if (targetClassIds !== undefined) {
      
      await this.prisma.eventClass.deleteMany({ where: { eventId: id } });
      if (targetClassIds.length > 0) {
        await this.prisma.eventClass.createMany({
          data: targetClassIds.map((classId) => ({
            eventId: id,
            classId,
          })),
        });
      }
    }

    return this.findById(id);
  }

  async delete(id: string, schoolId?: string) {
    await this.findById(id, schoolId);
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Etkinlik silindi' };
  }

  async getUpcoming(schoolId: string) {
    return this.prisma.event.findMany({
      where: { schoolId, isActive: true, startDate: { gte: new Date() } },
      include: {
        targetClasses: { include: { class: { select: { id: true, name: true } } } },
        _count: { select: { participants: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    });
  }
}
