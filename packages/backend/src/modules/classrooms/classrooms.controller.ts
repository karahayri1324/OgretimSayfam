import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classrooms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Derslikler')
@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassroomsController {
  constructor(private classroomsService: ClassroomsService) {}

  @Get()
  @ApiOperation({ summary: 'Derslikleri listele' })
  async findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('type') type?: string,
  ) {
    return { success: true, data: await this.classroomsService.findAll(schoolId, type) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Derslik detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classroomsService.findById(id, schoolId) };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Derslik oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateClassroomDto) {
    return { success: true, data: await this.classroomsService.create(schoolId, dto) };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Derslik güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassroomDto, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classroomsService.update(id, dto, schoolId) };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Derslik sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classroomsService.delete(id, schoolId) };
  }
}
