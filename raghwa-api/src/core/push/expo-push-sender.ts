import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { PushSender, type PushMessage, type PushResult } from './push-sender';

const ENDPOINT = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
const BATCH = 100;

type Ticket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

/**
 * Expo Push Service: one HTTP API for both FCM (Android) and APNs (iOS); the credentials live in EAS.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Injectable()
export class ExpoPushSender extends PushSender {
  private readonly logger = new Logger('Push');

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  async send(messages: PushMessage[]): Promise<PushResult> {
    const invalidTokens: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const tickets = await this.post(batch);
      tickets.forEach((t, j) => {
        if (t.status !== 'error') return;
        if (t.details?.error === 'DeviceNotRegistered') invalidTokens.push(batch[j].to);
        else this.logger.warn(`Push to ${batch[j].to} failed: ${t.details?.error ?? ''} ${t.message}`);
      });
    }
    return { invalidTokens };
  }

  private async post(batch: PushMessage[]): Promise<Ticket[]> {
    const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const accessToken = this.config.get('EXPO_ACCESS_TOKEN', { infer: true });
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      // `channelId` matches the Android channel the app creates (lib/push.ts in customer-app).
      body: JSON.stringify(batch.map((m) => ({ ...m, sound: 'default', priority: 'high', channelId: 'default' }))),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Expo push API answered ${res.status}: ${await res.text().catch(() => '')}`);
    return ((await res.json()) as { data: Ticket[] }).data;
  }
}
