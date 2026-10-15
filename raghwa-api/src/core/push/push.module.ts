import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../../config/app-config';
import { ConsolePushSender } from './console-push-sender';
import { ExpoPushSender } from './expo-push-sender';
import { PushToken } from './push-token.entity';
import { PushSender } from './push-sender';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  providers: [
    {
      provide: PushSender,
      inject: [ConfigService],
      useFactory: (config: AppConfig) =>
        config.get('PUSH_DRIVER', { infer: true }) === 'expo' ? new ExpoPushSender(config) : new ConsolePushSender(),
    },
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
