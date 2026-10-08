import { Global, Module } from '@nestjs/common';
import { ConsoleSmsSender } from './console-sms-sender';
import { SmsSender } from './sms-sender';

// To add a real gateway: implement SmsSender, add its name to SMS_DRIVER in env.validation.ts and pick it here.
@Global()
@Module({
  providers: [{ provide: SmsSender, useClass: ConsoleSmsSender }],
  exports: [SmsSender],
})
export class SmsModule {}
