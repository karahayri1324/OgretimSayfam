import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { TakeAttendanceDto, UpdateAttendanceDto, TeacherAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Yoklama')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post()
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama al' })
  async takeAttendance(@CurrentUser('schoolId') schoolId: string, @Body() dto: TakeAttendanceDto) {
    return { success: true, data: await this.attendanceService.takeAttendance(schoolId, dto) };
  }

  @Put(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama kaydı güncelle' })
  async updateAttendance(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return { success: true, data: await this.attendanceService.updateAttendance(id, schoolId, dto) };
  }

  @Delete(':id')
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama kaydı sil' })
  async deleteAttendance(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    await this.attendanceService.deleteAttendance(id, schoolId);
    return { success: true };
  }

  @Get('class/:classId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Sınıf yoklaması (tarihe göre)' })
  async getByClass(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('date') date: string,
  ) {
    return { success: true, data: await this.attendanceService.getByClassAndDate(classId, date, schoolId) };
  }

  @Get('student/:studentProfileId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Öğrenci yoklama geçmişi' })
  async getByStudent(
    @Param('studentProfileId') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return { success: true, data: await this.attendanceService.getByStudent(id, schoolId, startDate, endDate) };
  }

  @Get('student/:studentProfileId/stats')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Öğrenci yoklama istatistikleri' })
  async getStudentStats(@Param('studentProfileId') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.attendanceService.getStudentStats(id, schoolId) };
  }

  @Post('teacher')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğretmen yoklaması kaydet' })
  async recordTeacherAttendance(
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: TeacherAttendanceDto,
  ) {
    return { success: true, data: await this.attendanceService.recordTeacherAttendance(schoolId, dto) };
  }

  @Get('teacher/absent')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Gelmeyen öğretmenler' })
  async getAbsentTeachers(@CurrentUser('schoolId') schoolId: string, @Query('date') date: string) {
    return { success: true, data: await this.attendanceService.getAbsentTeachers(schoolId, date) };
  }

  @Get('class/:classId/stats')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Sınıf yoklama istatistikleri' })
  async getClassStats(
    @Param('classId') classId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return { success: true, data: await this.attendanceService.getClassAttendanceStats(classId, schoolId, startDate, endDate) };
  }
}
