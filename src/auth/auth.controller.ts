import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { Rol } from '@prisma/client';

import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  @Post('register')
  register(
    @Body()
    body: {
      nombre: string;
      email: string;
      password: string;
      rol?: Rol;
      rut?: string;
      fechaNacimiento?: string;
      especialidad?: string;
    },
  ) {
    return this.authService.register(
      body.nombre,
      body.email,
      body.password,
      body.rol,
      body.rut,
      body.fechaNacimiento,
      body.especialidad,
    );
  }

  @Post('login')
  login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.login(
      body.email,
      body.password,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(
      req.user.sub,
    );
  }
}