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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama al' })
  async takeAttendance(@Body() dto: TakeAttendanceDto) {
    return { success: true, data: await this.attendanceService.takeAttendance(dto) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama kaydı güncelle' })
  async updateAttendance(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return { success: true, data: await this.attendanceService.updateAttendance(id, dto) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Yoklama kaydı sil' })
  async deleteAttendance(@Param('id') id: string) {
    await this.attendanceService.deleteAttendance(id);
    return { success: true };
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sınıf yoklaması (tarihe göre)' })
  async getByClass(@Param('classId') classId: string, @Query('date') date: string) {
    return { success: true, data: await this.attendanceService.getByClassAndDate(classId, date) };
  }

  @Get('student/:studentProfileId')
  @ApiOperation({ summary: 'Öğrenci yoklama geçmişi' })
  async getByStudent(
    @Param('studentProfileId') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return { success: true, data: await this.attendanceService.getByStudent(id, startDate, endDate) };
  }

  @Get('student/:studentProfileId/stats')
  @ApiOperation({ summary: 'Öğrenci yoklama istatistikleri' })
  async getStudentStats(@Param('studentProfileId') id: string) {
    return { success: true, data: await this.attendanceService.getStudentStats(id) };
  }

  @Post('teacher')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğretmen yoklaması kaydet' })
  async recordTeacherAttendance(@Body() dto: TeacherAttendanceDto) {
    return { success: true, data: await this.attendanceService.recordTeacherAttendance(dto) };
  }

  @Get('teacher/absent')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Gelmeyen öğretmenler' })
  async getAbsentTeachers(@CurrentUser('schoolId') schoolId: string, @Query('date') date: string) {
    return { success: true, data: await this.attendanceService.getAbsentTeachers(schoolId, date) };
  }

  @Get('class/:classId/stats')
  @ApiOperation({ summary: 'Sınıf yoklama istatistikleri' })
  async getClassStats(
    @Param('classId') classId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return { success: true, data: await this.attendanceService.getClassAttendanceStats(classId, startDate, endDate) };
  }
}
