import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubstitutionDto {
  @ApiProperty() @IsString() timetableEntryId: string;
  @ApiProperty() @IsString() originalTeacherId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() substituteTeacherId?: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() isEmptyLesson?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

export class UpdateSubstitutionDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() substituteTeacherId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isEmptyLesson?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
