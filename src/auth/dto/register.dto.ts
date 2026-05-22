import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Rol } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  especialidad?: string;
}