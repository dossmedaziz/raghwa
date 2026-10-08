import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CustomerApiModule } from './api/customer/customer-api.module';
import { OwnerApiModule } from './api/owner/owner-api.module';
import { ClockModule } from './common/clock/clock.module';
import type { AppConfig } from './config/app-config';
import { validateEnv } from './config/env.validation';
import { NotificationsModule } from './core/notifications/notifications.module';
import { SmsModule } from './core/sms/sms.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv, envFilePath: ['.env'] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfig) => [{ ttl: 60_000, limit: config.get('THROTTLE_LIMIT', { infer: true }) }],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    ClockModule,
    SmsModule,
    NotificationsModule,
    OwnerApiModule,
    CustomerApiModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
