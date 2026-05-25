import {
  Injectable,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { EstadoCita, Rol } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type BloqueoData = {
  fechaHora: Date;
  motivo?: string;
  profesionalId: number;
};

@Injectable()
export class CitasService {
  constructor(private prisma: PrismaService) {}

  private getPartesChile(fecha: Date) {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(fecha);

    const obtener = (type: string) =>
      Number(partes.find((p) => p.type === type)?.value);

    return {
      year: obtener('year'),
      month: obtener('month'),
      day: obtener('day'),
      hour: obtener('hour'),
      minute: obtener('minute'),
    };
  }

  private getFechaChile(fecha: Date) {
    const partes = this.getPartesChile(fecha);

    return (
      `${partes.year}-` +
      `${String(partes.month).padStart(2, '0')}-` +
      `${String(partes.day).padStart(2, '0')}`
    );
  }

  private getHoraChile(fecha: Date) {
    const partes = this.getPartesChile(fecha);

    return (
      `${String(partes.hour).padStart(2, '0')}:` +
      `${String(partes.minute).padStart(2, '0')}`
    );
  }

  private crearFechaHoraChile(fecha: string, hora: string) {
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);

    let fechaUtc = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, 0, 0),
    );

    for (let i = 0; i < 3; i++) {
      const partesChile = this.getPartesChile(fechaUtc);

      const deseado = Date.UTC(
        year,
        month - 1,
        day,
        hours,
        minutes,
      );

      const actual = Date.UTC(
        partesChile.year,
        partesChile.month - 1,
        partesChile.day,
        partesChile.hour,
        partesChile.minute,
      );

      fechaUtc = new Date(fechaUtc.getTime() + (deseado - actual));
    }

    return fechaUtc;
  }

  private parseFechaHora(fechaHora: string) {
    const tieneZonaHoraria =
      fechaHora.endsWith('Z') ||
      /[+-]\d{2}:\d{2}$/.test(fechaHora);

    if (tieneZonaHoraria) {
      return new Date(fechaHora);
    }

    const [fecha, horaCompleta] = fechaHora.split('T');

    if (!fecha || !horaCompleta) {
      return new Date(fechaHora);
    }

    const hora = horaCompleta.substring(0, 5);

    return this.crearFechaHoraChile(fecha, hora);
  }

  private getRangoDiaChile(fecha: string) {
    const inicio = this.crearFechaHoraChile(fecha, '00:00');
    const fin = this.crearFechaHoraChile(fecha, '23:59');

    fin.setSeconds(59);
    fin.setMilliseconds(999);

    return { inicio, fin };
  }

  async findAllByUser(user: { sub: number; rol: Rol }) {
    if (user.rol === Rol.ADMIN) {
      return this.prisma.cita.findMany({
        include: {
          paciente: true,
          profesional: true,
        },
        orderBy: {
          fechaHora: 'asc',
        },
      });
    }

    if (user.rol === Rol.PROFESIONAL) {
      const profesional = await this.prisma.profesional.findUnique({
        where: {
          usuarioId: user.sub,
        },
      });

      if (!profesional) {
        throw new ForbiddenException('No tiene perfil de profesional');
      }

      return this.prisma.cita.findMany({
        where: {
          profesionalId: profesional.id,
        },
        include: {
          paciente: true,
          profesional: true,
        },
        orderBy: {
          fechaHora: 'asc',
        },
      });
    }

    const paciente = await this.prisma.paciente.findUnique({
      where: {
        usuarioId: user.sub,
      },
    });

    if (!paciente) {
      throw new ForbiddenException('No tiene perfil de paciente');
    }

    return this.prisma.cita.findMany({
      where: {
        pacienteId: paciente.id,
      },
      include: {
        paciente: true,
        profesional: true,
      },
      orderBy: {
        fechaHora: 'asc',
      },
    });
  }

  async resolverProfesionalId(
    user: { sub: number; rol: Rol },
    profesionalIdBody?: number,
  ) {
    if (user.rol === Rol.ADMIN) {
      if (!profesionalIdBody) {
        throw new ForbiddenException('Debe enviar profesionalId');
      }

      return profesionalIdBody;
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: {
        usuarioId: user.sub,
      },
    });

    if (!profesional) {
      throw new ForbiddenException('No tiene perfil profesional');
    }

    return profesional.id;
  }

  async getDiasBloqueados(profesionalId: number) {
    return this.prisma.horarioBloqueado.findMany({
      where: {
        profesionalId,
      },
      orderBy: {
        fechaHora: 'asc',
      },
    });
  }

  async getHorariosDisponibles(fecha: string, profesionalId: number) {
    if (!fecha) {
      throw new BadRequestException('Debe enviar una fecha');
    }

    if (!profesionalId) {
      throw new BadRequestException('Debe enviar profesionalId');
    }

    const { inicio: inicioDia, fin: finDia } =
      this.getRangoDiaChile(fecha);

    const horarios: {
      hora: string;
      disponible: boolean;
      bloqueado?: boolean;
      bloqueoId?: number;
    }[] = [];

    let hora = 9;
    let minuto = 30;

    while (hora < 18) {
      const horaTexto = hora.toString().padStart(2, '0');
      const minutoTexto = minuto.toString().padStart(2, '0');

      horarios.push({
        hora: `${horaTexto}:${minutoTexto}`,
        disponible: true,
      });

      minuto += 20;

      if (minuto >= 60) {
        hora += 1;
        minuto -= 60;
      }
    }

    const citas = await this.prisma.cita.findMany({
      where: {
        profesionalId,
        fechaHora: {
          gte: inicioDia,
          lte: finDia,
        },
        NOT: {
          estado: EstadoCita.CANCELADA,
        },
      },
    });

    const bloqueos = await this.prisma.horarioBloqueado.findMany({
      where: {
        profesionalId,
        fechaHora: {
          gte: inicioDia,
          lte: finDia,
        },
      },
    });

    return horarios.map((horario) => {
      const ocupado = citas.some((cita) => {
        return (
          this.getFechaChile(cita.fechaHora) === fecha &&
          this.getHoraChile(cita.fechaHora) === horario.hora
        );
      });

      const bloqueo = bloqueos.find((b) => {
        return (
          this.getFechaChile(b.fechaHora) === fecha &&
          this.getHoraChile(b.fechaHora) === horario.hora
        );
      });

      return {
        ...horario,
        disponible: !ocupado && !bloqueo,
        bloqueado: !!bloqueo,
        bloqueoId: bloqueo?.id,
      };
    });
  }

  async bloquearSlot(
    fechaHora: string,
    motivo: string | undefined,
    profesionalId: number,
  ) {
    const fecha = this.parseFechaHora(fechaHora);

    const citaExistente = await this.prisma.cita.findFirst({
      where: {
        fechaHora: fecha,
        profesionalId,
        NOT: {
          estado: EstadoCita.CANCELADA,
        },
      },
    });

    if (citaExistente) {
      throw new ConflictException('No puede bloquear un horario ocupado');
    }

    const existe = await this.prisma.horarioBloqueado.findFirst({
      where: {
        fechaHora: fecha,
        profesionalId,
      },
    });

    if (existe) {
      throw new ConflictException('Ese horario ya está bloqueado');
    }

    return this.prisma.horarioBloqueado.create({
      data: {
        fechaHora: fecha,
        motivo,
        profesionalId,
      },
    });
  }

  async bloquearDia(
    fecha: string,
    motivo: string | undefined,
    profesionalId: number,
  ) {
    const bloqueos: BloqueoData[] = [];

    let hora = 9;
    let minuto = 30;

    while (hora < 18) {
      const horaTexto = hora.toString().padStart(2, '0');
      const minutoTexto = minuto.toString().padStart(2, '0');

      const fechaSlot = this.crearFechaHoraChile(
        fecha,
        `${horaTexto}:${minutoTexto}`,
      );

      const citaExistente = await this.prisma.cita.findFirst({
        where: {
          fechaHora: fechaSlot,
          profesionalId,
          NOT: {
            estado: EstadoCita.CANCELADA,
          },
        },
      });

      if (!citaExistente) {
        bloqueos.push({
          fechaHora: fechaSlot,
          motivo,
          profesionalId,
        });
      }

      minuto += 20;

      if (minuto >= 60) {
        hora += 1;
        minuto -= 60;
      }
    }

    return this.prisma.horarioBloqueado.createMany({
      data: bloqueos,
      skipDuplicates: true,
    });
  }

  async desbloquearDia(id: number, profesionalId: number) {
    const bloqueo = await this.prisma.horarioBloqueado.findUnique({
      where: {
        id,
      },
    });

    if (!bloqueo) {
      throw new NotFoundException('Bloqueo no encontrado');
    }

    if (bloqueo.profesionalId !== profesionalId) {
      throw new ForbiddenException(
        'No puede eliminar bloqueos de otro profesional',
      );
    }

    return this.prisma.horarioBloqueado.delete({
      where: {
        id,
      },
    });
  }

  async create(
    data: {
      fechaHora: string;
      pacienteId?: number;
      profesionalId: number;
    },
    user: {
      sub: number;
      email: string;
      rol: Rol;
    },
  ) {
    const fecha = this.parseFechaHora(data.fechaHora);

    this.validarHorario(fecha);

    const bloqueo = await this.prisma.horarioBloqueado.findFirst({
      where: {
        profesionalId: data.profesionalId,
        fechaHora: fecha,
      },
    });

    if (bloqueo) {
      throw new ConflictException('Ese horario está bloqueado');
    }

    let pacienteIdFinal = data.pacienteId;

    if (user.rol === Rol.PACIENTE) {
      const paciente = await this.prisma.paciente.findUnique({
        where: {
          usuarioId: user.sub,
        },
      });

      if (!paciente) {
        throw new ForbiddenException(
          'Este usuario no tiene perfil de paciente',
        );
      }

      pacienteIdFinal = paciente.id;
    }

    if (user.rol === Rol.ADMIN) {
      if (!pacienteIdFinal) {
        throw new BadRequestException(
          'El admin debe indicar un pacienteId',
        );
      }
    }

    if (!pacienteIdFinal) {
      throw new BadRequestException('Falta pacienteId');
    }

    const citaExistente = await this.prisma.cita.findFirst({
      where: {
        fechaHora: fecha,
        profesionalId: data.profesionalId,
        NOT: {
          estado: EstadoCita.CANCELADA,
        },
      },
    });

    if (citaExistente) {
      throw new ConflictException('Ese horario ya está ocupado');
    }

    return this.prisma.cita.create({
      data: {
        fechaHora: fecha,
        pacienteId: pacienteIdFinal,
        profesionalId: data.profesionalId,
      },
      include: {
        paciente: true,
        profesional: true,
      },
    });
  }

  async cancelar(
    id: number,
    user: {
      sub: number;
      rol: Rol;
    },
  ) {
    const cita = await this.prisma.cita.findUnique({
      where: {
        id,
      },
      include: {
        paciente: true,
      },
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (user.rol === Rol.PACIENTE) {
      if (cita.paciente.usuarioId !== user.sub) {
        throw new ForbiddenException(
          'No puede cancelar citas de otro paciente',
        );
      }
    }

    return this.prisma.cita.update({
      where: {
        id,
      },
      data: {
        estado: EstadoCita.CANCELADA,
      },
    });
  }

  private validarHorario(fecha: Date) {
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    const ahora = new Date();

    if (fecha < ahora) {
      throw new BadRequestException(
        'No se pueden crear citas en el pasado',
      );
    }

    const horaChile = this.getHoraChile(fecha);
    const [hora, minuto] = horaChile.split(':').map(Number);

    const minutosDelDia = hora * 60 + minuto;

    const inicio = 9 * 60 + 30;
    const fin = 18 * 60;

    if (minutosDelDia < inicio || minutosDelDia >= fin) {
      throw new BadRequestException(
        'Horario fuera del rango permitido',
      );
    }

    const diferencia = minutosDelDia - inicio;

    if (diferencia % 20 !== 0) {
      throw new BadRequestException(
        'La cita debe respetar bloques de 20 minutos desde las 09:30',
      );
    }
  }
}