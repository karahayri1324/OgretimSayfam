import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, ChangePasswordDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  // In-memory store for password reset tokens
  // TODO: Production ortamında Redis veya DB tablosu kullanılmalı
  private resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      this.logger.warn('JWT_REFRESH_SECRET is not configured! Falling back to JWT_SECRET for refresh tokens.');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true, classId: true } },
        parentProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmış');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        school: user.school,
        teacherProfileId: user.teacherProfile?.id,
        studentProfileId: user.studentProfile?.id,
        studentClassId: user.studentProfile?.classId,
        parentProfileId: user.parentProfile?.id,
      },
      ...tokens,
    };
  }

  async register(dto: RegisterDto, role: UserRole = UserRole.SCHOOL_ADMIN, schoolId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kullanılıyor');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        schoolId,
      },
    });

    // Create role-specific profile
    if (role === UserRole.TEACHER) {
      await this.prisma.teacherProfile.create({ data: { userId: user.id } });
    } else if (role === UserRole.STUDENT) {
      await this.prisma.studentProfile.create({ data: { userId: user.id } });
    } else if (role === UserRole.PARENT) {
      await this.prisma.parentProfile.create({ data: { userId: user.id } });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }

    // Delete old token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role, stored.user.schoolId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Mevcut şifre hatalı');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Şifre başarıyla değiştirildi' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    this.resetTokens.set(token, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    // TODO: Production ortamında e-posta ile sıfırlama bağlantısı gönderilmeli
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Password reset token generated for ${email}: ${token}`);
    } else {
      this.logger.log(`Password reset token generated for ${email}`);
    }

    return { message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi' };
  }

  async resetPassword(token: string, newPassword: string) {
    const stored = this.resetTokens.get(token);
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        this.resetTokens.delete(token);
      }
      throw new BadRequestException('Geçersiz veya süresi dolmuş token');
    }

    // Delete token immediately to prevent race condition (double-use)
    const userId = stored.userId;
    this.resetTokens.delete(token);

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Şifre başarıyla sıfırlandı' };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Çıkış yapıldı' };
  }

  private async generateTokens(userId: string, email: string, role: UserRole, schoolId: string | null) {
    const payload = { sub: userId, email, role, schoolId };

    const accessToken = this.jwt.sign(payload);

    const refreshSecret = this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET');
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
