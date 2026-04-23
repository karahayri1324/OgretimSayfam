import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassDiaryService } from './class-diary.service';
import { CreateClassDiaryDto, UpdateClassDiaryDto } from './dto/class-diary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sınıf Defteri')
@Controller('class-diary')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassDiaryController {
  constructor(private classDiaryService: ClassDiaryService) {}

  @Post()
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Sınıf defteri kaydı oluştur' })
  async create(@CurrentUser() user: any, @Body() dto: CreateClassDiaryDto) {
    if (!user.teacherProfile) throw new BadRequestException('Ogretmen profili bulunamadi');
    return {
      success: true,
      data: await this.classDiaryService.create(user.teacherProfile.id, user.schoolId, dto),
    };
  }

  @Put(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını güncelle' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateClassDiaryDto,
  ) {
    const teacherProfileId = user.role === 'TEACHER' ? user.teacherProfile?.id : undefined;
    return {
      success: true,
      data: await this.classDiaryService.update(id, user.schoolId, dto, teacherProfileId),
    };
  }

  @Get('class/:classId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Sınıf defteri (tarih bazlı)' })
  async getByDate(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('date') date: string,
  ) {
    return { success: true, data: await this.classDiaryService.getByClassAndDate(classId, date, schoolId) };
  }

  @Get('class/:classId/range')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Sınıf defteri (tarih aralığı)' })
  async getByRange(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      success: true,
      data: await this.classDiaryService.getByClassDateRange(classId, schoolId, startDate, endDate),
    };
  }

  @Delete(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını sil' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    const teacherProfileId = user.role === 'TEACHER' ? user.teacherProfile?.id : undefined;
    return {
      success: true,
      data: await this.classDiaryService.delete(id, user.schoolId, teacherProfileId),
    };
  }

  @Put(':id/approve')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını onayla' })
  async approve(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classDiaryService.approve(id, schoolId) };
  }
}
