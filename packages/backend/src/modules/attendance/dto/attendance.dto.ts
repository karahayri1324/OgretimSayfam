import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class StudentAttendanceDto {
  @ApiProperty() @IsString() studentProfileId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class TakeAttendanceDto {
  @ApiProperty() @IsString() timetableEntryId: string;
  @ApiProperty() @IsString() classId: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ type: [StudentAttendanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  students: StudentAttendanceDto[];
}

export class UpdateAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus, required: false }) @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class TeacherAttendanceDto {
  @ApiProperty() @IsString() teacherProfileId: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsBoolean() isPresent: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
