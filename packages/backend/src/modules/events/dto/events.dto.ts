import { IsString, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: EventType }) @IsEnum(EventType) type: EventType;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() endDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() startTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() endTime?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() targetClassIds?: string[];
}

export class UpdateEventDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() startDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() endDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() startTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() endTime?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() targetClassIds?: string[];
}
