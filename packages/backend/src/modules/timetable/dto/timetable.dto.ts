import { IsString, IsInt, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';

export class CreateTimeSlotDto {
  @ApiProperty() @IsInt() slotNumber: number;
  @ApiProperty({ example: '08:30' }) @IsString() startTime: string;
  @ApiProperty({ example: '09:10' }) @IsString() endTime: string;
}

export class CreateTimetableEntryDto {
  @ApiProperty() @IsString() classId: string;
  @ApiProperty() @IsString() subjectId: string;
  @ApiProperty() @IsString() timeSlotId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() classroomId?: string;
  @ApiProperty({ enum: DayOfWeek }) @IsEnum(DayOfWeek) dayOfWeek: DayOfWeek;
  @ApiProperty({ required: false }) @IsOptional() @IsString() teacherId?: string;
}

export class BulkCreateTimetableDto {
  @ApiProperty({ type: [CreateTimetableEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimetableEntryDto)
  entries: CreateTimetableEntryDto[];
}
