import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Delete,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { Rol } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CitasService } from './citas.service';

@UseGuards(AuthGuard('jwt'))
@Controller('citas')
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
    private readonly prisma: PrismaService,
  ) {}

  async resolverProfesionalId(
    user: any,
    profesionalIdBody?: number,
  ) {
    if (user.rol === Rol.ADMIN) {
      if (!profesionalIdBody) {
        throw new ForbiddenException(
          'Debe enviar profesionalId',
        );
      }

      return profesionalIdBody;
    }

    const profesional =
      await this.prisma.profesional.findUnique({
        where: {
          usuarioId: user.sub,
        },
      });

    if (!profesional) {
      throw new ForbiddenException(
        'No tiene perfil profesional',
      );
    }

    return profesional.id;
  }

  @Get()
  findAll(@Req() req: any) {
    return this.citasService.findAllByUser(
      req.user,
    );
  }

  @Get('disponibles')
  getDisponibles(
    @Query('fecha') fecha: string,

    @Query('profesionalId')
    profesionalId: string,
  ) {
    return this.citasService.getHorariosDisponibles(
      fecha,
      Number(profesionalId),
    );
  }

  @Post('bloquear-slot')
  async bloquearSlot(
    @Body()
    body: {
      fechaHora: string;
      motivo?: string;
      profesionalId?: number;
    },

    @Req() req: any,
  ) {
    const profesionalId =
      await this.resolverProfesionalId(
        req.user,
        body.profesionalId,
      );

    return this.citasService.bloquearSlot(
      body.fechaHora,
      body.motivo,
      profesionalId,
    );
  }

  @Post('bloquear-dia')
  async bloquearDia(
    @Body()
    body: {
      fecha: string;
      motivo?: string;
      profesionalId?: number;
    },

    @Req() req: any,
  ) {
    const profesionalId =
      await this.resolverProfesionalId(
        req.user,
        body.profesionalId,
      );

    return this.citasService.bloquearDia(
      body.fecha,
      body.motivo,
      profesionalId,
    );
  }

  @Delete('dias-bloqueados/:id')
  async desbloquearDia(
    @Param('id', ParseIntPipe)
    id: number,

    @Query('profesionalId')
    profesionalIdQuery: string,

    @Req() req: any,
  ) {
    const profesionalId =
      await this.resolverProfesionalId(
        req.user,
        profesionalIdQuery
          ? Number(
              profesionalIdQuery,
            )
          : undefined,
      );

    return this.citasService.desbloquearDia(
      id,
      profesionalId,
    );
  }

  @Post()
  create(
    @Body()
    body: {
      fechaHora: string;
      pacienteId?: number;
      profesionalId: number;
    },

    @Req() req: any,
  ) {
    return this.citasService.create(
      body,
      req.user,
    );
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe)
    id: number,

    @Req() req: any,
  ) {
    return this.citasService.cancelar(
      id,
      req.user,
    );
  }
}