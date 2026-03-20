import { IsString, IsInt, IsOptional, IsBoolean, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateClassroomDto {
  @ApiProperty({ example: 'Derslik 101' })
  @IsString()
  name: string;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ example: 'NORMAL', required: false, enum: ['NORMAL', 'LAB', 'GYM', 'CONFERENCE'] })
  @IsOptional()
  @IsString()
  @IsIn(['NORMAL', 'LAB', 'GYM', 'CONFERENCE'])
  type?: string;
}

export class UpdateClassroomDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ required: false, enum: ['NORMAL', 'LAB', 'GYM', 'CONFERENCE'] })
  @IsOptional()
  @IsString()
  @IsIn(['NORMAL', 'LAB', 'GYM', 'CONFERENCE'])
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
