import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('pacientes')
  async getPacientes() {
    return this.usersService.getPacientes();
  }

  @Get('profesionales')
  async getProfesionales() {
    return this.usersService.getProfesionales();
  }
}