import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto, UpdateGradeDto, CreateGradeCategoryDto, BulkGradeEntryDto } from './dto/grades.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  role: string;
  schoolId: string;
  teacherProfile?: { id: string };
}

@ApiTags('Notlar')
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Post('bulk')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Toplu not girisi' })
  async bulkCreateGrades(@Body() dto: BulkGradeEntryDto, @CurrentUser() user: AuthUser) {
    if (!user.teacherProfile) throw new BadRequestException('Ogretmen profili bulunamadi');
    return {
      success: true,
      data: await this.gradesService.bulkCreateGrades(dto, user.teacherProfile.id, user.schoolId),
    };
  }

  @Post()
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Not ekle' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateGradeDto) {
    if (!user.teacherProfile) throw new BadRequestException('Ogretmen profili bulunamadi');
    return {
      success: true,
      data: await this.gradesService.createGrade(user.teacherProfile.id, user.schoolId, dto),
    };
  }

  @Put(':id')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Not güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: AuthUser) {
    const teacherProfileId = user.teacherProfile?.id;
    return {
      success: true,
      data: await this.gradesService.updateGrade(id, user.schoolId, dto, teacherProfileId),
    };
  }

  @Delete(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Not sil' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const teacherProfileId = user.role === 'SCHOOL_ADMIN' ? undefined : user.teacherProfile?.id;
    return {
      success: true,
      data: await this.gradesService.deleteGrade(id, user.schoolId, teacherProfileId),
    };
  }

  @Get('parent/:parentProfileId')
  @Roles('PARENT')
  @ApiOperation({ summary: 'Velinin cocuklarinin notlari' })
  async getParentGrades(
    @Param('parentProfileId') parentProfileId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return { success: true, data: await this.gradesService.getParentGrades(parentProfileId, schoolId) };
  }

  @Get('student/:studentProfileId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Öğrenci notları' })
  async getStudentGrades(
    @Param('studentProfileId') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('termId') termId?: string,
  ) {
    return { success: true, data: await this.gradesService.getStudentGrades(id, schoolId, termId) };
  }

  @Get('class/:classId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Sınıf notları (ders ve dönem bazlı)' })
  async getClassGrades(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
  ) {
    return { success: true, data: await this.gradesService.getClassGrades(classId, schoolId, subjectId, termId) };
  }

  @Get('student/:studentProfileId/average')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Öğrenci ders ortalaması' })
  async getAverage(
    @Param('studentProfileId') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
  ) {
    return { success: true, data: await this.gradesService.getStudentAverage(id, schoolId, subjectId, termId) };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Not kategorileri' })
  async getCategories(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.gradesService.getCategories(schoolId) };
  }

  @Post('categories')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Not kategorisi oluştur' })
  async createCategory(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateGradeCategoryDto) {
    return { success: true, data: await this.gradesService.createCategory(schoolId, dto) };
  }

  @Post('categories/defaults')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Varsayılan not kategorilerini oluştur' })
  async createDefaults(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.gradesService.createDefaultCategories(schoolId) };
  }
}
