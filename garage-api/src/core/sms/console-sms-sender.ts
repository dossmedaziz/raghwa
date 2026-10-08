import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from './sms-sender';

/** Development driver: prints messages (including OTP codes) to the server log instead of sending them. */
@Injectable()
export class ConsoleSmsSender extends SmsSender {
  private readonly logger = new Logger('SMS');

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`to +216 ${phone}: ${message}`);
  }
}
