import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './shared/exceptions/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Static files
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
  });

  // CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173',
      process.env.FRONTEND_URL_PRODUCTION,
    ].filter((origin): origin is string => Boolean(origin)),
    credentials: true,
  });

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restaurant API')
    .setDescription('Restaurant management system — Auth endpoints')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on ${process.env.BACKEND_URL}/api/v1`);
  console.log(`📚 Swagger docs at ${process.env.BACKEND_URL}/api/docs`);
}

bootstrap();
