import { IsString, IsOptional, IsDateString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDiaryDto {
  @ApiProperty() @IsString() @IsNotEmpty() timetableEntryId: string;
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ example: 'Trigonometri - Sinüs ve Kosinüs' }) @IsString() @IsNotEmpty({ message: 'Konu boş olamaz' }) topic: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
}

export class UpdateClassDiaryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() topic?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isApproved?: boolean;
}
