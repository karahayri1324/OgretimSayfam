import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Duyurular')
@Controller('announcements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Duyuru oluştur' })
  async create(@CurrentUser('id') userId: string, @CurrentUser('schoolId') schoolId: string, @Body() dto: CreateAnnouncementDto) {
    return { success: true, data: await this.announcementsService.create(userId, schoolId, dto) };
  }

  @Get()
  @ApiOperation({ summary: 'Duyuruları listele' })
  async findAll(@CurrentUser('id') userId: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.announcementsService.findAll(schoolId, userId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Duyuru detayı' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.announcementsService.findById(id) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Duyuru güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return { success: true, data: await this.announcementsService.update(id, dto) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Duyuru sil' })
  async delete(@Param('id') id: string) {
    return { success: true, data: await this.announcementsService.delete(id) };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Duyuruyu okundu olarak işaretle' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return { success: true, data: await this.announcementsService.markAsRead(id, userId) };
  }
}
