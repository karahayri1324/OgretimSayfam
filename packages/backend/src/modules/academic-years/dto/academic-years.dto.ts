import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2025-2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2025-09-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-20' })
  @IsDateString()
  endDate: string;
}

export class UpdateAcademicYearDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateTermDto {
  @ApiProperty({ example: '1. Dönem' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2025-09-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-20' })
  @IsDateString()
  endDate: string;
}

export class UpdateTermDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
