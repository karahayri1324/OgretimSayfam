import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId?: string, role?: UserRole) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, isActive: true, lastLoginAt: true,
        schoolId: true, createdAt: true,
        teacherProfile: { select: { id: true, branch: true, title: true } },
        studentProfile: { select: { id: true, studentNumber: true, classId: true, class: { select: { name: true } } } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async findById(id: string, schoolId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true, isActive: true,
        lastLoginAt: true, schoolId: true, createdAt: true,
        teacherProfile: true, studentProfile: true, parentProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (schoolId && user.schoolId && user.schoolId !== schoolId) throw new ForbiddenException('Bu kayda erisim yetkiniz yok');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta zaten kullanılıyor');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const { studentNumber, ...userData } = dto;
    const user = await this.prisma.user.create({
      data: { ...userData, password: hashedPassword },
    });

    // Create profile based on role
    if (dto.role === UserRole.TEACHER) {
      await this.prisma.teacherProfile.create({ data: { userId: user.id } });
    } else if (dto.role === UserRole.STUDENT) {
      await this.prisma.studentProfile.create({ data: { userId: user.id, ...(studentNumber ? { studentNumber } : {}) } });
    } else if (dto.role === UserRole.PARENT) {
      await this.prisma.parentProfile.create({ data: { userId: user.id } });
    }

    return this.findById(user.id);
  }

  async update(id: string, dto: UpdateUserDto, schoolId?: string) {
    await this.findById(id, schoolId);
    await this.prisma.user.update({ where: { id }, data: dto });
    return this.findById(id);
  }

  async delete(id: string, schoolId?: string) {
    await this.findById(id, schoolId);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Kullanıcı silindi' };
  }
}
