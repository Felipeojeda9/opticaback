import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // CORS: solo orígenes permitidos
  const origenesPermitidos = [
    'http://localhost:5173',           // dev local
    'https://opticafront.vercel.app',  // producción Vercel
  ];

  // Permitir también previews de Vercel (xxxx-yyy.vercel.app)
  const regexPreviewVercel = /^https:\/\/opticafront-.*\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requests sin origin (Postman, curl, healthchecks)
      if (!origin) return callback(null, true);

      if (origenesPermitidos.includes(origin) || regexPreviewVercel.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS bloqueado para: ${origin}`));
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();