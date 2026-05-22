import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class BloquearDiaDto {
  @IsString()
  @IsNotEmpty()
  fecha: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsInt()
  profesionalId?: number;
}