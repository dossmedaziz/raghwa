import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/app-config';
import { ClockService } from './clock.service';

@Global()
@Module({
  providers: [
    {
      provide: ClockService,
      inject: [ConfigService],
      useFactory: (config: AppConfig) => new ClockService(config.get('APP_TIMEZONE', { infer: true })),
    },
  ],
  exports: [ClockService],
})
export class ClockModule {}
