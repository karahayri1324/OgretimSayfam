import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/classes.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sınıflar')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Sınıfları listele' })
  async findAll(@CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classesService.findAll(schoolId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sınıf detayı' })
  async findById(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classesService.findById(id, schoolId) };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf oluştur' })
  async create(@CurrentUser('schoolId') schoolId: string, @Body() dto: CreateClassDto) {
    return { success: true, data: await this.classesService.create(schoolId, dto) };
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf güncelle' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDto, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classesService.update(id, dto, schoolId) };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Sınıf sil' })
  async delete(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return { success: true, data: await this.classesService.delete(id, schoolId) };
  }

  @Post(':id/students/:studentProfileId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğrenciyi sınıfa ekle' })
  async addStudent(
    @Param('id') classId: string,
    @Param('studentProfileId') spId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return { success: true, data: await this.classesService.addStudent(classId, spId, schoolId) };
  }

  @Delete(':id/students/:studentProfileId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Öğrenciyi sınıftan çıkar' })
  async removeStudent(
    @Param('studentProfileId') spId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return { success: true, data: await this.classesService.removeStudent(spId, schoolId) };
  }
}
