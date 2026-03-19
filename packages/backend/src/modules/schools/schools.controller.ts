import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/schools.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Okullar')
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Tüm okulları listele' })
  async findAll() {
    return { success: true, data: await this.schoolsService.findAll() };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Okul detayı' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.schoolsService.findById(id) };
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Okul oluştur' })
  async create(@Body() dto: CreateSchoolDto) {
    return { success: true, data: await this.schoolsService.create(dto) };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Okul güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return { success: true, data: await this.schoolsService.update(id, dto) };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Okul sil' })
  async delete(@Param('id') id: string) {
    return { success: true, data: await this.schoolsService.delete(id) };
  }
}
