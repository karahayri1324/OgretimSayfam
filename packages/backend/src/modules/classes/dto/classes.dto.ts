import { IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @ApiProperty({ example: '9-A' }) @IsString() name: string;
  @ApiProperty({ example: 9 }) @Type(() => Number) @IsInt() @Min(1) @Max(12) grade: number;
  @ApiProperty({ example: 'A' }) @IsString() section: string;
  @ApiProperty({ required: false, example: 30 }) @IsOptional() @Type(() => Number) @IsInt() capacity?: number;
}

export class UpdateClassDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() capacity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
