import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@okul1.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin@okul1.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  @ApiProperty({ example: 'Ahmet' })
  @IsString()
  @IsNotEmpty({ message: 'Ad boş olamaz' })
  firstName: string;

  @ApiProperty({ example: 'Yılmaz' })
  @IsString()
  @IsNotEmpty({ message: 'Soyad boş olamaz' })
  lastName: string;

  @ApiProperty({ example: '05551234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Mevcut şifre boş olamaz' })
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır' })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@okul1.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Token boş olamaz' })
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır' })
  newPassword: string;
}
