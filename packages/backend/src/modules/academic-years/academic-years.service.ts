import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateTermDto,
  UpdateTermDto,
} from './dto/academic-years.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: { orderBy: { startDate: 'asc' } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string, schoolId?: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: { orderBy: { startDate: 'asc' } },
      },
    });
    if (!year) throw new NotFoundException('Akademik yıl bulunamadı');
    if (schoolId && year.schoolId !== schoolId) {
      throw new ForbiddenException('Bu akademik yıla erişim yetkiniz yok');
    }
    return year;
  }

  async create(schoolId: string, dto: CreateAcademicYearDto) {
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
    }
    return this.prisma.academicYear.create({
      data: {
        schoolId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: { terms: true },
    });
  }

  async update(id: string, schoolId: string, dto: UpdateAcademicYearDto) {
    await this.findById(id, schoolId);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    return this.prisma.academicYear.update({
      where: { id },
      data,
      include: { terms: true },
    });
  }

  async delete(id: string, schoolId: string) {
    await this.findById(id, schoolId);
    await this.prisma.academicYear.delete({ where: { id } });
    return { message: 'Akademik yıl silindi' };
  }

  async setCurrent(id: string, schoolId: string) {
    const year = await this.findById(id, schoolId);

    await this.prisma.academicYear.updateMany({
      where: { schoolId: year.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
      include: { terms: true },
    });
  }

  async createTerm(academicYearId: string, schoolId: string, dto: CreateTermDto) {
    await this.findById(academicYearId, schoolId);

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
    }

    return this.prisma.term.create({
      data: {
        academicYearId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  private async getTermWithSchool(termId: string) {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: { select: { schoolId: true } } },
    });
    if (!term) throw new NotFoundException('Dönem bulunamadı');
    return term;
  }

  async updateTerm(termId: string, schoolId: string, dto: UpdateTermDto) {
    const term = await this.getTermWithSchool(termId);
    if (term.academicYear.schoolId !== schoolId) {
      throw new ForbiddenException('Bu döneme erişim yetkiniz yok');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    return this.prisma.term.update({
      where: { id: termId },
      data,
    });
  }

  async deleteTerm(termId: string, schoolId: string) {
    const term = await this.getTermWithSchool(termId);
    if (term.academicYear.schoolId !== schoolId) {
      throw new ForbiddenException('Bu döneme erişim yetkiniz yok');
    }
    await this.prisma.term.delete({ where: { id: termId } });
    return { message: 'Dönem silindi' };
  }

  async setCurrentTerm(termId: string, schoolId: string) {
    const term = await this.getTermWithSchool(termId);
    if (term.academicYear.schoolId !== schoolId) {
      throw new ForbiddenException('Bu döneme erişim yetkiniz yok');
    }

    await this.prisma.term.updateMany({
      where: { academicYearId: term.academicYearId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.term.update({
      where: { id: termId },
      data: { isCurrent: true },
    });
  }
}
