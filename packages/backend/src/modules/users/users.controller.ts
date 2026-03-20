import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Kullanıcılar')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Kullanıcıları listele' })
  async findAll(@CurrentUser('schoolId') schoolId: string, @CurrentUser('role') role: string, @Query('role') filterRole?: UserRole) {
    const sid = role === 'SUPER_ADMIN' ? undefined : schoolId;
    return { success: true, data: await this.usersService.findAll(sid, filterRole) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kullanıcı detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @CurrentUser('role') role: string) {
    const sid = role === 'SUPER_ADMIN' ? undefined : schoolId;
    return { success: true, data: await this.usersService.findById(id, sid) };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Kullanıcı oluştur' })
  async create(@Body() dto: CreateUserDto, @CurrentUser('schoolId') schoolId: string, @CurrentUser('role') role: string) {
    if (role !== 'SUPER_ADMIN') dto.schoolId = schoolId;
    return { success: true, data: await this.usersService.create(dto) };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Kullanıcı güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser('schoolId') schoolId: string, @CurrentUser('role') role: string) {
    const sid = role === 'SUPER_ADMIN' ? undefined : schoolId;
    return { success: true, data: await this.usersService.update(id, dto, sid) };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Kullanıcı sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string, @CurrentUser('role') role: string) {
    const sid = role === 'SUPER_ADMIN' ? undefined : schoolId;
    return { success: true, data: await this.usersService.delete(id, sid) };
  }
}
