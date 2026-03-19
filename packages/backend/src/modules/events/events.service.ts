import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createdById: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        schoolId,
        createdById,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.event.findMany({
      where: { schoolId, isActive: true },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        participants: true,
      },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.event.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Etkinlik silindi' };
  }

  async getUpcoming(schoolId: string) {
    return this.prisma.event.findMany({
      where: { schoolId, isActive: true, startDate: { gte: new Date() } },
      include: { _count: { select: { participants: true } } },
      orderBy: { startDate: 'asc' },
      take: 10,
    });
  }
}
