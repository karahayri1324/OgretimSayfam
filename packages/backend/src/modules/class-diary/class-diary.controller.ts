import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassDiaryService } from './class-diary.service';
import { CreateClassDiaryDto, UpdateClassDiaryDto } from './dto/class-diary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sınıf Defteri')
@Controller('class-diary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClassDiaryController {
  constructor(private classDiaryService: ClassDiaryService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Sınıf defteri kaydı oluştur' })
  async create(@CurrentUser() user: any, @Body() dto: CreateClassDiaryDto) {
    return { success: true, data: await this.classDiaryService.create(user.teacherProfile.id, dto) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDiaryDto) {
    return { success: true, data: await this.classDiaryService.update(id, dto) };
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sınıf defteri (tarih bazlı)' })
  async getByDate(@Param('classId') classId: string, @Query('date') date: string) {
    return { success: true, data: await this.classDiaryService.getByClassAndDate(classId, date) };
  }

  @Get('class/:classId/range')
  @ApiOperation({ summary: 'Sınıf defteri (tarih aralığı)' })
  async getByRange(
    @Param('classId') classId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return { success: true, data: await this.classDiaryService.getByClassDateRange(classId, startDate, endDate) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını sil' })
  async delete(@Param('id') id: string) {
    return { success: true, data: await this.classDiaryService.delete(id) };
  }

  @Put(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf defteri kaydını onayla' })
  async approve(@Param('id') id: string) {
    return { success: true, data: await this.classDiaryService.approve(id) };
  }
}
