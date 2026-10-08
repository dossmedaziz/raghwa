import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app-config';
import { configureApp, setupSwagger } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService) as AppConfig;
  if (config.get('SWAGGER_ENABLED', { infer: true })) setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API on http://localhost:${port} · docs: /docs/owner and /docs/customer`, 'Bootstrap');
}
void bootstrap();
