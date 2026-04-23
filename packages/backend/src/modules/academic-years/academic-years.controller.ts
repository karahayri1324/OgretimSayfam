import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AcademicYearsService } from './academic-years.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateTermDto,
  UpdateTermDto,
} from './dto/academic-years.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Akademik Yıllar')
@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AcademicYearsController {
  constructor(private academicYearsService: AcademicYearsService) {}

  @Get()
  @ApiOperation({ summary: 'Akademik yılları listele' })
  async findAll(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.findAll(schoolId) };
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Akademik yıl oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateAcademicYearDto) {
    return { success: true, data: await this.academicYearsService.create(schoolId, dto) };
  }

  @Put('terms/:termId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dönem güncelle' })
  async updateTerm(
    @Param('termId') termId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: UpdateTermDto,
  ) {
    return { success: true, data: await this.academicYearsService.updateTerm(termId, schoolId, dto) };
  }

  @Delete('terms/:termId')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dönem sil' })
  async deleteTerm(@Param('termId') termId: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.deleteTerm(termId, schoolId) };
  }

  @Put('terms/:termId/set-current')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aktif dönemi belirle' })
  async setCurrentTerm(@Param('termId') termId: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.setCurrentTerm(termId, schoolId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Akademik yıl detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.findById(id, schoolId) };
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Akademik yıl güncelle' })
  async update(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return { success: true, data: await this.academicYearsService.update(id, schoolId, dto) };
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Akademik yıl sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.delete(id, schoolId) };
  }

  @Put(':id/set-current')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aktif akademik yılı belirle' })
  async setCurrent(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.academicYearsService.setCurrent(id, schoolId) };
  }

  @Post(':id/terms')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dönem oluştur' })
  async createTerm(
    @Param('id') id: string,
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateTermDto,
  ) {
    return { success: true, data: await this.academicYearsService.createTerm(id, schoolId, dto) };
  }
}
