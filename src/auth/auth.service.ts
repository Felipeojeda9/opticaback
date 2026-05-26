import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { Rol } from '@prisma/client';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(
    nombre: string,
    email: string,
    password: string,
    rol: Rol = Rol.PACIENTE,
    rut?: string,
    fechaNacimiento?: string,
    especialidad?: string,
    telefono?: string,
  ) {
    const existe =
      await this.usersService.findByEmail(email);

    if (existe) {
      throw new ConflictException(
        'El email ya esta registrado',
      );
    }

    const usuario =
      await this.usersService.create(
        nombre,
        email,
        password,
        rol,
      );

    if (rol === Rol.PACIENTE) {
      if (!rut || !fechaNacimiento) {
        throw new ConflictException(
          'Faltan datos para crear paciente',
        );
      }

      await this.usersService.createPaciente({
        nombre,
        rut,
        fechaNacimiento: new Date(
          fechaNacimiento,
        ),
        usuarioId: usuario.id,
        telefono,
        email,
      });
    }

    if (rol === Rol.PROFESIONAL) {
      if (!rut || !especialidad) {
        throw new ConflictException(
          'Faltan datos para crear profesional',
        );
      }

      await this.usersService.createProfesional({
        nombre,
        rut,
        especialidad,
        usuarioId: usuario.id,
      });
    }

    return this.signToken(
      usuario.id,
      usuario.email,
      usuario.rol,
    );
  }

  async login(
    email: string,
    password: string,
  ) {
    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    if (!usuario) {
      throw new UnauthorizedException(
        'Credenciales invalidas',
      );
    }

    const valido = await bcrypt.compare(
      password,
      usuario.password,
    );

    if (!valido) {
      throw new UnauthorizedException(
        'Credenciales invalidas',
      );
    }

    return this.signToken(
      usuario.id,
      usuario.email,
      usuario.rol,
    );
  }

  async me(userId: number) {
    const usuario =
      await this.usersService.findById(
        userId,
      );

    if (!usuario) {
      throw new UnauthorizedException(
        'Usuario no encontrado',
      );
    }

    return usuario;
  }

  private signToken(
    id: number,
    email: string,
    rol: Rol,
  ) {
    const payload = {
      sub: id,
      email,
      rol,
    };

    return {
      acces_token:
        this.jwtService.sign(payload),
    };
  }
}