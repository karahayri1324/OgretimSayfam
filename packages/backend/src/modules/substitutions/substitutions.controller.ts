import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubstitutionsService } from './substitutions.service';
import { CreateSubstitutionDto, UpdateSubstitutionDto } from './dto/substitutions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vekil Öğretmen')
@Controller('substitutions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubstitutionsController {
  constructor(private substitutionsService: SubstitutionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Vekil atama oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateSubstitutionDto) {
    return { success: true, data: await this.substitutionsService.create(schoolId, dto) };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Vekil atama güncelle' })
  async update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: UpdateSubstitutionDto,
  ) {
    return { success: true, data: await this.substitutionsService.update(id, schoolId, dto) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Vekil atama sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.substitutionsService.delete(id, schoolId) };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Günün vekil atamaları' })
  async getByDate(@CurrentUser('schoolId') schoolId: string, @Query('date') date: string) {
    return { success: true, data: await this.substitutionsService.getByDate(schoolId, date) };
  }

  @Get('available-teachers')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Müsait öğretmenler' })
  async getAvailable(
    @CurrentUser('schoolId') schoolId: string,
    @Query('date') date: string,
    @Query('timeSlotId') timeSlotId: string,
  ) {
    return { success: true, data: await this.substitutionsService.getAvailableTeachers(schoolId, date, timeSlotId) };
  }
}
