import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CitasService', () => {
  let service: CitasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasService,
        { provide: PrismaService, useValue: { cita: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } } },
      ],
    }).compile();

    service = module.get<CitasService>(CitasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});