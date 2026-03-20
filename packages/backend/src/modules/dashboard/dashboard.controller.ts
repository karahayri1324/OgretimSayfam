import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin dashboard' })
  async getAdminDashboard(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.dashboardService.getAdminDashboard(schoolId) };
  }

  @Get('teacher')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Öğretmen dashboard' })
  async getTeacherDashboard(@CurrentUser() user: any) {
    return { success: true, data: await this.dashboardService.getTeacherDashboard(user.teacherProfile?.id, user.schoolId) };
  }

  @Get('student')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Öğrenci dashboard' })
  async getStudentDashboard(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.dashboardService.getStudentDashboard(
        user.studentProfile?.id,
        user.studentProfile?.classId,
        user.schoolId,
      ),
    };
  }

  @Get('parent')
  @UseGuards(RolesGuard)
  @Roles('PARENT')
  @ApiOperation({ summary: 'Veli dashboard' })
  async getParentDashboard(@CurrentUser('id') userId: string) {
    const data = await this.dashboardService.getParentDashboard(userId);
    return { success: true, data };
  }
}
