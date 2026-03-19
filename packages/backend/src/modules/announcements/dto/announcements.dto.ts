import { IsString, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementCategory } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() content: string;
  @ApiProperty({ enum: AnnouncementCategory, required: false }) @IsOptional() @IsEnum(AnnouncementCategory) category?: AnnouncementCategory;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isPinned?: boolean;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() targetClassIds?: string[];
}

export class UpdateAnnouncementDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isPinned?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
