import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Rol } from '@prisma/client';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(
    nombre: string,
    email: string,
    password: string,
    rol: Rol,
  ) {
    const hash = await bcrypt.hash(password, 10);

    return this.prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hash,
        rol,
      },
    });
  }

  async createPaciente(data: {
  nombre: string;
  rut: string;
  fechaNacimiento: Date;
  usuarioId: number;
  telefono?: string;
  email?: string;
}) {
  return this.prisma.paciente.create({
    data: {
      nombre: data.nombre,
      rut: data.rut,
      fechaNacimiento: data.fechaNacimiento,
      usuarioId: data.usuarioId,
      telefono: data.telefono,
      email: data.email,
    },
  });
}

  async createProfesional(data: {
    nombre: string;
    rut: string;
    especialidad: string;
    usuarioId: number;
  }) {
    return this.prisma.profesional.create({
      data: {
        nombre: data.nombre,
        rut: data.rut,
        especialidad: data.especialidad,
        usuarioId: data.usuarioId,
      },
    });
  }

  async getPacientes() {
    return this.prisma.paciente.findMany({
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async getProfesionales() {
    return this.prisma.profesional.findMany({
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        paciente: true,
        profesional: true,
        createdAt: true,
      },
    });
  }
}