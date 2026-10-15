import { Injectable, Logger } from '@nestjs/common';
import { PushSender, type PushMessage, type PushResult } from './push-sender';

/** Prints pushes to the server log instead of sending them. */
@Injectable()
export class ConsolePushSender extends PushSender {
  private readonly logger = new Logger('Push');

  async send(messages: PushMessage[]): Promise<PushResult> {
    for (const m of messages) this.logger.log(`to ${m.to}: ${m.title} · ${m.body} ${JSON.stringify(m.data)}`);
    return { invalidTokens: [] };
  }
}
