import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto, UpdateGradeDto, CreateGradeCategoryDto, BulkGradeEntryDto } from './dto/grades.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notlar')
@Controller('grades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Toplu not girisi' })
  async bulkCreateGrades(@Body() dto: BulkGradeEntryDto, @CurrentUser() user: any) {
    if (!user.teacherProfile) throw new BadRequestException('Ogretmen profili bulunamadi');
    return { success: true, data: await this.gradesService.bulkCreateGrades(dto, user.teacherProfile.id) };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Not ekle' })
  async create(@CurrentUser() user: any, @Body() dto: CreateGradeDto) {
    if (!user.teacherProfile) throw new BadRequestException('Ogretmen profili bulunamadi');
    return { success: true, data: await this.gradesService.createGrade(user.teacherProfile.id, dto) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Not güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: any) {
    const teacherProfileId = user.teacherProfile?.id;
    return { success: true, data: await this.gradesService.updateGrade(id, dto, teacherProfileId) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Not sil' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    const teacherProfileId = user.role === 'SCHOOL_ADMIN' ? undefined : user.teacherProfile?.id;
    return { success: true, data: await this.gradesService.deleteGrade(id, teacherProfileId) };
  }

  @Get('parent/:parentProfileId')
  @UseGuards(RolesGuard)
  @Roles('PARENT')
  @ApiOperation({ summary: 'Velinin cocuklarinin notlari' })
  async getParentGrades(@Param('parentProfileId') parentProfileId: string) {
    return { success: true, data: await this.gradesService.getParentGrades(parentProfileId) };
  }

  @Get('student/:studentProfileId')
  @ApiOperation({ summary: 'Öğrenci notları' })
  async getStudentGrades(@Param('studentProfileId') id: string, @Query('termId') termId?: string) {
    return { success: true, data: await this.gradesService.getStudentGrades(id, termId) };
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sınıf notları (ders ve dönem bazlı)' })
  async getClassGrades(
    @Param('classId') classId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
  ) {
    return { success: true, data: await this.gradesService.getClassGrades(classId, subjectId, termId) };
  }

  @Get('student/:studentProfileId/average')
  @ApiOperation({ summary: 'Öğrenci ders ortalaması' })
  async getAverage(
    @Param('studentProfileId') id: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
  ) {
    return { success: true, data: await this.gradesService.getStudentAverage(id, subjectId, termId) };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Not kategorileri' })
  async getCategories(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.gradesService.getCategories(schoolId) };
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Not kategorisi oluştur' })
  async createCategory(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateGradeCategoryDto) {
    return { success: true, data: await this.gradesService.createCategory(schoolId, dto) };
  }

  @Post('categories/defaults')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Varsayılan not kategorilerini oluştur' })
  async createDefaults(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.gradesService.createDefaultCategories(schoolId) };
  }
}
