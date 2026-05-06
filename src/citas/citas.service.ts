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

  async findAllByUser(user: {
    sub: number;
    rol: Rol;
  }) {
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
      const profesional =
        await this.prisma.profesional.findUnique({
          where: {
            usuarioId: user.sub,
          },
        });

      if (!profesional) {
        throw new ForbiddenException(
          'No tiene perfil de profesional',
        );
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

    const paciente =
      await this.prisma.paciente.findUnique({
        where: {
          usuarioId: user.sub,
        },
      });

    if (!paciente) {
      throw new ForbiddenException(
        'No tiene perfil de paciente',
      );
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

  async getDiasBloqueados(
    profesionalId: number,
  ) {
    return this.prisma.horarioBloqueado.findMany({
      where: {
        profesionalId,
      },

      orderBy: {
        fechaHora: 'asc',
      },
    });
  }

  async getHorariosDisponibles(
    fecha: string,
    profesionalId: number,
  ) {
    if (!fecha) {
      throw new BadRequestException(
        'Debe enviar una fecha',
      );
    }

    if (!profesionalId) {
      throw new BadRequestException(
        'Debe enviar profesionalId',
      );
    }

    const inicioDia = new Date(
      `${fecha}T00:00:00`,
    );

    const finDia = new Date(
      `${fecha}T23:59:59`,
    );

    const horarios: {
      hora: string;
      disponible: boolean;
      bloqueado?: boolean;
      bloqueoId?: number;
    }[] = [];

    let hora = 9;
    let minuto = 30;

    while (hora < 18) {
      const horaTexto = hora
        .toString()
        .padStart(2, '0');

      const minutoTexto = minuto
        .toString()
        .padStart(2, '0');

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

    const citas =
      await this.prisma.cita.findMany({
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

    const bloqueos =
      await this.prisma.horarioBloqueado.findMany({
        where: {
          profesionalId,

          fechaHora: {
            gte: inicioDia,
            lte: finDia,
          },
        },
      });

    return horarios.map((horario) => {
      const ocupado =
        citas.some((cita) => {
          const fecha =
            new Date(
              cita.fechaHora,
            );

          const horaTexto =
            fecha
              .getHours()
              .toString()
              .padStart(2, '0');

          const minutoTexto =
            fecha
              .getMinutes()
              .toString()
              .padStart(2, '0');

          return (
            `${horaTexto}:${minutoTexto}` ===
            horario.hora
          );
        });

      const bloqueo =
        bloqueos.find((b) => {
          const fecha =
            new Date(
              b.fechaHora,
            );

          const horaTexto =
            fecha
              .getHours()
              .toString()
              .padStart(2, '0');

          const minutoTexto =
            fecha
              .getMinutes()
              .toString()
              .padStart(2, '0');

          return (
            `${horaTexto}:${minutoTexto}` ===
            horario.hora
          );
        });

      return {
        ...horario,

        disponible:
          !ocupado && !bloqueo,

        bloqueado:
          !!bloqueo,

        bloqueoId:
          bloqueo?.id,
      };
    });
  }

  async bloquearSlot(
    fechaHora: string,
    motivo: string | undefined,
    profesionalId: number,
  ) {
    const fecha =
      new Date(fechaHora);

    const citaExistente =
      await this.prisma.cita.findFirst({
        where: {
          fechaHora: fecha,

          profesionalId,

          NOT: {
            estado:
              EstadoCita.CANCELADA,
          },
        },
      });

    if (citaExistente) {
      throw new ConflictException(
        'No puede bloquear un horario ocupado',
      );
    }

    const existe =
      await this.prisma.horarioBloqueado.findFirst({
        where: {
          fechaHora: fecha,
          profesionalId,
        },
      });

    if (existe) {
      throw new ConflictException(
        'Ese horario ya está bloqueado',
      );
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
    const bloqueos: BloqueoData[] =
      [];

    let hora = 9;
    let minuto = 30;

    while (hora < 18) {
      const horaTexto = hora
        .toString()
        .padStart(2, '0');

      const minutoTexto = minuto
        .toString()
        .padStart(2, '0');

      const fechaSlot =
        new Date(
          `${fecha}T${horaTexto}:${minutoTexto}:00`,
        );

      const citaExistente =
        await this.prisma.cita.findFirst({
          where: {
            fechaHora:
              fechaSlot,

            profesionalId,

            NOT: {
              estado:
                EstadoCita.CANCELADA,
            },
          },
        });

      if (!citaExistente) {
        bloqueos.push({
          fechaHora:
            fechaSlot,

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

  async desbloquearDia(
    id: number,
    profesionalId: number,
  ) {
    const bloqueo =
      await this.prisma.horarioBloqueado.findUnique({
        where: {
          id,
        },
      });

    if (!bloqueo) {
      throw new NotFoundException(
        'Bloqueo no encontrado',
      );
    }

    if (
      bloqueo.profesionalId !==
      profesionalId
    ) {
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
    const fecha = new Date(
      data.fechaHora,
    );

    this.validarHorario(fecha);

    const bloqueo =
      await this.prisma.horarioBloqueado.findFirst({
        where: {
          profesionalId:
            data.profesionalId,

          fechaHora: fecha,
        },
      });

    if (bloqueo) {
      throw new ConflictException(
        'Ese horario está bloqueado',
      );
    }

    let pacienteIdFinal =
      data.pacienteId;

    if (user.rol === Rol.PACIENTE) {
      const paciente =
        await this.prisma.paciente.findUnique({
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
      throw new BadRequestException(
        'Falta pacienteId',
      );
    }

    const citaExistente =
      await this.prisma.cita.findFirst({
        where: {
          fechaHora: fecha,

          profesionalId:
            data.profesionalId,

          NOT: {
            estado:
              EstadoCita.CANCELADA,
          },
        },
      });

    if (citaExistente) {
      throw new ConflictException(
        'Ese horario ya está ocupado',
      );
    }

    return this.prisma.cita.create({
      data: {
        fechaHora: fecha,

        pacienteId:
          pacienteIdFinal,

        profesionalId:
          data.profesionalId,
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
    const cita =
      await this.prisma.cita.findUnique({
        where: {
          id,
        },

        include: {
          paciente: true,
        },
      });

    if (!cita) {
      throw new NotFoundException(
        'Cita no encontrada',
      );
    }

    if (user.rol === Rol.PACIENTE) {
      if (
        cita.paciente.usuarioId !==
        user.sub
      ) {
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
        estado:
          EstadoCita.CANCELADA,
      },
    });
  }

  private validarHorario(
    fecha: Date,
  ) {
    if (
      Number.isNaN(fecha.getTime())
    ) {
      throw new BadRequestException(
        'Fecha inválida',
      );
    }

    const ahora = new Date();

    if (fecha < ahora) {
      throw new BadRequestException(
        'No se pueden crear citas en el pasado',
      );
    }

    const hora = fecha.getHours();

    const minuto =
      fecha.getMinutes();

    const minutosDelDia =
      hora * 60 + minuto;

    const inicio =
      9 * 60 + 30;

    const fin = 18 * 60;

    if (
      minutosDelDia < inicio ||
      minutosDelDia >= fin
    ) {
      throw new BadRequestException(
        'Horario fuera del rango permitido',
      );
    }

    const diferencia =
      minutosDelDia - inicio;

    if (diferencia % 20 !== 0) {
      throw new BadRequestException(
        'La cita debe respetar bloques de 20 minutos desde las 09:30',
      );
    }
  }
}