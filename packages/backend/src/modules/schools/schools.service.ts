import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/schools.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.school.findMany({
      include: { _count: { select: { users: true, classes: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, classes: true, subjects: true, classrooms: true } },
        academicYears: { orderBy: { startDate: 'desc' }, take: 1 },
      },
    });
    if (!school) throw new NotFoundException('Okul bulunamadı');
    return school;
  }

  async findBySlug(slug: string) {
    const school = await this.prisma.school.findUnique({ where: { slug } });
    if (!school) throw new NotFoundException('Okul bulunamadı');
    return school;
  }

  async create(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Bu slug zaten kullanılıyor');
    return this.prisma.school.create({ data: dto });
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findById(id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.school.delete({ where: { id } });
    return { message: 'Okul silindi' };
  }
}
