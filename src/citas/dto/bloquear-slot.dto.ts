import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class BloquearSlotDto {
  @IsString()
  @IsNotEmpty()
  fechaHora: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsInt()
  profesionalId?: number;
}