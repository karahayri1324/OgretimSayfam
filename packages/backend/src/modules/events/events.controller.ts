import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Etkinlikler')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Etkinlik oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @CurrentUser('id') userId: string, @Body() dto: CreateEventDto) {
    return { success: true, data: await this.eventsService.create(schoolId, userId, dto) };
  }

  @Get()
  @ApiOperation({ summary: 'Etkinlikleri listele' })
  async findAll(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.eventsService.findAll(schoolId) };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Yaklaşan etkinlikler' })
  async getUpcoming(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.eventsService.getUpcoming(schoolId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Etkinlik detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.eventsService.findById(id, schoolId) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Etkinlik güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.eventsService.update(id, dto, schoolId) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Etkinlik sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.eventsService.delete(id, schoolId) };
  }
}
