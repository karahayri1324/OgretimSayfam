import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Matematik' }) @IsString() name: string;
  @ApiProperty({ required: false, example: 'MAT' }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ required: false, example: '#3B82F6' }) @IsOptional() @IsString() color?: string;
}

export class UpdateSubjectDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
