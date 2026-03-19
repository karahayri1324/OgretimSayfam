import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, UpdateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from './dto/assignments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ödevler')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Ödev oluştur' })
  async create(@Body() dto: CreateAssignmentDto) {
    return { success: true, data: await this.assignmentsService.create(dto) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Ödev güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return { success: true, data: await this.assignmentsService.update(id, dto) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ödev sil' })
  async delete(@Param('id') id: string) {
    return { success: true, data: await this.assignmentsService.delete(id) };
  }

  @Get('teacher/my')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Öğretmenin ödevleri' })
  async getTeacherAssignments(@CurrentUser() user: any) {
    return { success: true, data: await this.assignmentsService.getTeacherAssignments(user.teacherProfile.id) };
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sınıf ödevleri' })
  async getByClass(@Param('classId') classId: string, @Query('subjectId') subjectId?: string) {
    return { success: true, data: await this.assignmentsService.getByClass(classId, subjectId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ödev detayı' })
  async getById(@Param('id') id: string) {
    return { success: true, data: await this.assignmentsService.getById(id) };
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ödev teslimlerini listele' })
  async getSubmissions(@Param('id') id: string) {
    return { success: true, data: await this.assignmentsService.getSubmissions(id) };
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Ödev teslim et' })
  async submit(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: SubmitAssignmentDto) {
    return { success: true, data: await this.assignmentsService.submit(id, user.studentProfile.id, dto) };
  }

  @Post('submissions/:submissionId/grade')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Ödev notla' })
  async gradeSubmission(@Param('submissionId') id: string, @Body() dto: GradeSubmissionDto) {
    return { success: true, data: await this.assignmentsService.gradeSubmission(id, dto) };
  }

  @Get('student/my')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Öğrencinin ödevleri' })
  async getMyAssignments(@CurrentUser() user: any) {
    return { success: true, data: await this.assignmentsService.getStudentAssignments(user.studentProfile.id) };
  }
}
