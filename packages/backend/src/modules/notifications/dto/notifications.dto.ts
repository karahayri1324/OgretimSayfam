import { IsString, IsOptional, IsUUID, IsNotEmpty, IsIn, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty() @IsString() @IsUUID() userId: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Bildirim başlığı boş olamaz' }) title: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Bildirim mesajı boş olamaz' }) message: string;
  @ApiProperty({ enum: ['ATTENDANCE', 'GRADE', 'ANNOUNCEMENT', 'ASSIGNMENT', 'EVENT', 'SYSTEM'] })
  @IsString()
  @IsIn(['ATTENDANCE', 'GRADE', 'ANNOUNCEMENT', 'ASSIGNMENT', 'EVENT', 'SYSTEM'], { message: 'Geçersiz bildirim tipi' })
  type: string;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() data?: Record<string, unknown>;
}
