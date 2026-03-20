import { IsString, IsOptional, IsDateString, IsArray, IsEnum, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @ApiProperty() @IsString() @IsUUID() classId: string;
  @ApiProperty() @IsString() @IsUUID() subjectId: string;
  @ApiProperty() @IsString() @IsUUID() termId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() dueDate: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() attachments?: string[];
}

export class UpdateAssignmentDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dueDate?: string;
}

export class SubmitAssignmentDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() attachments?: string[];
}

export class GradeSubmissionDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) @Max(100) score: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() feedback?: string;
}
