import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subjects.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dersler')
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Dersleri listele' })
  async findAll(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.subjectsService.findAll(schoolId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ders detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.subjectsService.findById(id, schoolId) };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateSubjectDto) {
    return { success: true, data: await this.subjectsService.create(schoolId, dto) };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.subjectsService.update(id, dto, schoolId) };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Ders sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.subjectsService.delete(id, schoolId) };
  }
}
