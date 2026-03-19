import { IsString, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGradeDto {
  @ApiProperty() @IsString() studentProfileId: string;
  @ApiProperty() @IsString() subjectId: string;
  @ApiProperty() @IsString() termId: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) @Max(100) score: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() date: string;
}

export class UpdateGradeDto {
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) score?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
}

export class CreateGradeCategoryDto {
  @ApiProperty({ example: 'Yazılı' }) @IsString() name: string;
  @ApiProperty({ example: 'EXAM' }) @IsString() code: string;
  @ApiProperty({ example: 0.5 }) @Type(() => Number) @IsNumber() weight: number;
}
