import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushToken, type PushLang } from './push-token.entity';
import { PushSender } from './push-sender';

@Injectable()
export class PushService {
  constructor(
    @InjectRepository(PushToken) private readonly tokens: Repository<PushToken>,
    private readonly sender: PushSender,
  ) {}

  /** Saves this phone's token for the customer (taking it over from another account if needed) and its language. */
  async register(customerId: string, token: string, lang: PushLang): Promise<void> {
    await this.tokens.upsert({ token, customerId, lang }, ['token']);
  }

  /** Called on logout: this phone stops receiving the customer's pushes. */
  async unregister(customerId: string, token: string): Promise<void> {
    await this.tokens.delete({ customerId, token });
  }

  /** Pushes to every phone of the customer, in each phone's language. Tokens the push service rejects are dropped. */
  async notifyCustomer(customerId: string, text: (lang: PushLang) => { title: string; body: string }, data: Record<string, string>) {
    const rows = await this.tokens.findBy({ customerId });
    if (!rows.length) return;
    const { invalidTokens } = await this.sender.send(rows.map((r) => ({ to: r.token, ...text(r.lang), data })));
    if (invalidTokens.length) await this.tokens.delete({ token: In(invalidTokens) });
  }
}
