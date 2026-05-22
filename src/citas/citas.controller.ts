import { Body, Controller, Get, Patch, Param, ParseIntPipe, Post, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearSlotDto } from './dto/bloquear-slot.dto';
import { BloquearDiaDto } from './dto/bloquear-dia.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.citasService.findAllByUser(req.user);
  }

  @Get('disponibles')
  getDisponibles(
    @Query('fecha') fecha: string,
    @Query('profesionalId') profesionalId: string,
  ) {
    return this.citasService.getHorariosDisponibles(fecha, Number(profesionalId));
  }

  @Post('bloquear-slot')
  async bloquearSlot(@Body() body: BloquearSlotDto, @Req() req: any) {
    const profesionalId = await this.citasService.resolverProfesionalId(req.user, body.profesionalId);
    return this.citasService.bloquearSlot(body.fechaHora, body.motivo, profesionalId);
  }

  @Post('bloquear-dia')
  async bloquearDia(@Body() body: BloquearDiaDto, @Req() req: any) {
    const profesionalId = await this.citasService.resolverProfesionalId(req.user, body.profesionalId);
    return this.citasService.bloquearDia(body.fecha, body.motivo, profesionalId);
  }

  @Delete('dias-bloqueados/:id')
  async desbloquearDia(
    @Param('id', ParseIntPipe) id: number,
    @Query('profesionalId') profesionalIdQuery: string,
    @Req() req: any,
  ) {
    const profesionalId = await this.citasService.resolverProfesionalId(
      req.user,
      profesionalIdQuery ? Number(profesionalIdQuery) : undefined,
    );
    return this.citasService.desbloquearDia(id, profesionalId);
  }

  @Post()
  create(@Body() body: CreateCitaDto, @Req() req: any) {
    return this.citasService.create(body, req.user);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.citasService.cancelar(id, req.user);
  }
}