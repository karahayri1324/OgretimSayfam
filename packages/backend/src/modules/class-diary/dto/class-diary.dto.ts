import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDiaryDto {
  @ApiProperty() @IsString() timetableEntryId: string;
  @ApiProperty() @IsString() classId: string;
  @ApiProperty() @IsString() subjectId: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ example: 'Trigonometri - Sinüs ve Kosinüs' }) @IsString() topic: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
}

export class UpdateClassDiaryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() topic?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isApproved?: boolean;
}
