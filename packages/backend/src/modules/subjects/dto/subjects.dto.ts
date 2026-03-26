import { IsString, IsOptional, IsBoolean, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Matematik' }) @IsString() @IsNotEmpty({ message: 'Ders adı boş olamaz' }) name: string;
  @ApiProperty({ required: false, example: 'MAT' }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ required: false, example: '#3B82F6' }) @IsOptional() @IsString() color?: string;
}

export class UpdateSubjectDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
