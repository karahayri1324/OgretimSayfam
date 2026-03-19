import { Controller, Get, Post, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { FetIntegrationService } from './fet-integration.service';
import { CreateTimeSlotDto, CreateTimetableEntryDto, BulkCreateTimetableDto } from './dto/timetable.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ders Programı')
@Controller('timetable')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TimetableController {
  constructor(
    private timetableService: TimetableService,
    private fetIntegrationService: FetIntegrationService,
  ) {}

  // ==================== TIME SLOTS ====================

  @Get('time-slots')
  @ApiOperation({ summary: 'Ders saatlerini getir' })
  async getTimeSlots(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.timetableService.getTimeSlots(schoolId) };
  }

  @Post('time-slots')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders saati ekle' })
  async createTimeSlot(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateTimeSlotDto) {
    return { success: true, data: await this.timetableService.createTimeSlot(schoolId, dto) };
  }

  @Post('time-slots/defaults')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Varsayılan ders saatlerini oluştur' })
  async createDefaults(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.timetableService.createDefaultTimeSlots(schoolId) };
  }

  // ==================== TIMETABLE ENTRIES ====================

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sınıf ders programı' })
  async getByClass(@Param('classId') classId: string) {
    return { success: true, data: await this.timetableService.getByClass(classId) };
  }

  @Get('teacher/:teacherId')
  @ApiOperation({ summary: 'Öğretmen ders programı' })
  async getByTeacher(@Param('teacherId') teacherId: string) {
    return { success: true, data: await this.timetableService.getByTeacher(teacherId) };
  }

  @Get('classroom/:classroomId')
  @ApiOperation({ summary: 'Derslik ders programı' })
  async getByClassroom(@Param('classroomId') classroomId: string) {
    return { success: true, data: await this.timetableService.getByClassroom(classroomId) };
  }

  @Post('entries')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders programı kaydı ekle' })
  async createEntry(@Body() dto: CreateTimetableEntryDto) {
    return { success: true, data: await this.timetableService.createEntry(dto) };
  }

  @Post('entries/bulk')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Toplu ders programı kaydı ekle' })
  async bulkCreate(@Body() dto: BulkCreateTimetableDto) {
    return { success: true, data: await this.timetableService.bulkCreate(dto) };
  }

  @Delete('entries/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders programı kaydı sil' })
  async deleteEntry(@Param('id') id: string) {
    return { success: true, data: await this.timetableService.deleteEntry(id) };
  }

  // ==================== ÖĞRETMEN ATAMALARI ====================

  @Get('assignments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Öğretmen atamalarını getir' })
  async getAssignments(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.timetableService.getTeacherAssignments(schoolId) };
  }

  @Post('assignments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğretmen ataması ekle' })
  async createAssignment(@Body() dto: { teacherProfileId: string; classId: string; subjectId: string; hoursPerWeek: number }) {
    return { success: true, data: await this.timetableService.createTeacherAssignment(dto) };
  }

  @Delete('assignments/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğretmen ataması sil' })
  async deleteAssignment(@Param('id') id: string) {
    return { success: true, data: await this.timetableService.deleteTeacherAssignment(id) };
  }

  // ==================== FET ENTEGRASYONU ====================

  @Get('fet/health')
  @ApiOperation({ summary: 'FET servis durumu' })
  async fetHealth() {
    const health = await this.fetIntegrationService.checkHealth();
    return { success: true, data: health };
  }

  @Get('fet/preview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'FET oluşturma önizleme - hangi veriler gönderilecek' })
  async fetPreview(@CurrentUser('schoolId') schoolId: string) {
    const preview = await this.fetIntegrationService.getPreviewData(schoolId);
    return { success: true, data: preview };
  }

  @Post('fet/generate')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'FET ile ders programı oluştur (async)' })
  async fetGenerate(
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { constraints?: any },
  ) {
    const result = await this.fetIntegrationService.generateTimetable(schoolId, body?.constraints);
    return { success: result.success, data: result };
  }

  @Post('fet/generate-sync')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'FET ile ders programı oluştur (senkron - bekler)' })
  async fetGenerateSync(
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { constraints?: any },
  ) {
    const result = await this.fetIntegrationService.generateTimetableSync(schoolId, body?.constraints);
    return result;
  }

  @Get('fet/status/:jobId')
  @ApiOperation({ summary: 'FET iş durumunu kontrol et' })
  async fetJobStatus(@Param('jobId') jobId: string) {
    const result = await this.fetIntegrationService.checkJobStatus(jobId);
    return result;
  }

  @Get('fet/result/:jobId')
  @ApiOperation({ summary: 'FET iş sonucunu getir' })
  async fetJobResult(@Param('jobId') jobId: string) {
    const result = await this.fetIntegrationService.getJobResult(jobId);
    return result;
  }

  @Post('fet/import')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'FET sonucunu veritabanına aktar' })
  async fetImport(
    @CurrentUser('schoolId') schoolId: string,
    @Body() body: { entries: any[] },
  ) {
    if (!body?.entries || !Array.isArray(body.entries)) {
      throw new BadRequestException({
        success: false,
        message: 'entries alanı gerekli ve bir dizi olmalıdır',
      });
    }
    const result = await this.fetIntegrationService.importFetResult(schoolId, body.entries);
    return { success: true, data: result };
  }

  @Delete('clear/:classId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf ders programını temizle' })
  async clearClass(@Param('classId') classId: string) {
    return { success: true, data: await this.timetableService.clearClassTimetable(classId) };
  }
}
