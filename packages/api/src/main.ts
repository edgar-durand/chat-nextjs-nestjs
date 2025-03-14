import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Increase size limit to allow file uploads (10MB)
  app.use(json({ limit: '25mb' }));
  
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
