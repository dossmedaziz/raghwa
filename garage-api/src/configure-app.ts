import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { CustomerApiModule } from './api/customer/customer-api.module';
import { OwnerApiModule } from './api/owner/owner-api.module';
import type { AppConfig } from './config/app-config';

/** Global HTTP setup shared by main.ts and the e2e tests, so tests exercise exactly what runs in production. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService) as AppConfig;

  app.use(helmet());
  const origins = config.get('CORS_ORIGINS', { infer: true }).split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : false, credentials: false });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields…
      forbidNonWhitelisted: true, // …and reject requests that send them
      transform: true, // plain JSON → DTO class instances (enables defaults and @Type conversions)
      stopAtFirstError: false,
    }),
  );
}

/** Two separate documents: one per app, so each frontend only sees (and generates a client for) its own API. */
export function setupSwagger(app: INestApplication): void {
  const docs = [
    {
      path: 'docs/owner',
      module: OwnerApiModule,
      title: 'Raghwa Pro API: garage owners',
      description: 'Used by garage-web. Every `/v1/owner/garages/{garageId}/…` route only accepts garages of the logged-in owner.',
    },
    {
      path: 'docs/customer',
      module: CustomerApiModule,
      title: 'Raghwa API: customers',
      description: 'Used by the mobile app. Garage browsing is public; booking requires a customer token.',
    },
  ];
  for (const d of docs) {
    const builder = new DocumentBuilder()
      .setTitle(d.title)
      .setDescription(
        `${d.description}\n\nErrors: \`{ statusCode, message, code? }\`. Business-rule errors carry a stable \`code\` ` +
          '(e.g. `SLOT_FULL`) for the app to translate. Dates are `YYYY-MM-DD`, times `HH:MM` in Africa/Tunis, prices in TND.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, builder, { include: [d.module] });
    SwaggerModule.setup(d.path, app, document, { jsonDocumentUrl: `${d.path}/openapi.json` });
  }
}
