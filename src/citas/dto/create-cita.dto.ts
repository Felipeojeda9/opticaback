import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCitaDto {
  @IsString()
  @IsNotEmpty()
  fechaHora: string;

  @IsOptional()
  @IsInt()
  pacienteId?: number;

  @IsInt()
  profesionalId: number;
}