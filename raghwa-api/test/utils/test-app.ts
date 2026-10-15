import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ClockService } from '../../src/common/clock/clock.service';
import { configureApp, setupSwagger } from '../../src/configure-app';
import { PushSender, type PushMessage, type PushResult } from '../../src/core/push/push-sender';
import { SmsSender } from '../../src/core/sms/sms-sender';

/** Wednesday 21 October 2026, 11:15 in Tunis (UTC+1): the same frozen "now" as the garage-web prototype. */
export const NOW = '2026-10-21T10:15:00Z';
export const TODAY = '2026-10-21';
export const TOMORROW = '2026-10-22'; // Thursday: open 08:00-19:00, break 13:00-14:00 with the default week
export const SUNDAY = '2026-10-25'; // closed with the default week

export class TestClock extends ClockService {
  current = new Date(NOW);

  constructor() {
    super('Africa/Tunis');
  }

  override now(): Date {
    return new Date(this.current);
  }

  set(iso: string) {
    this.current = new Date(iso);
  }

  advance(seconds: number) {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

export class FakeSms extends SmsSender {
  messages: { phone: string; message: string }[] = [];

  async send(phone: string, message: string): Promise<void> {
    this.messages.push({ phone, message });
  }

  to(phone: string) {
    return this.messages.filter((m) => m.phone === phone);
  }

  /** The 4-digit code of the latest message sent to this phone. */
  lastCode(phone: string): string {
    const msg = this.to(phone).at(-1);
    const code = msg?.message.match(/\b(\d{4})\b/)?.[1];
    if (!code) throw new Error(`No OTP was sent to ${phone}`);
    return code;
  }
}

export class FakePush extends PushSender {
  messages: PushMessage[] = [];
  /** Tokens to report as uninstalled on the next sends. */
  invalid = new Set<string>();

  async send(messages: PushMessage[]): Promise<PushResult> {
    this.messages.push(...messages);
    return { invalidTokens: messages.map((m) => m.to).filter((t) => this.invalid.has(t)) };
  }
}

export interface TestContext {
  app: INestApplication<App>;
  http: () => ReturnType<typeof request>;
  clock: TestClock;
  sms: FakeSms;
  push: FakePush;
  db: DataSource;
  /** Empties every table and resets the clock and the SMS and push outboxes. Call in beforeEach. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

/** Boots the real AppModule (real Postgres, real HTTP pipeline) with a frozen clock and a fake SMS gateway. */
export async function createTestApp(opts: { swagger?: boolean } = {}): Promise<TestContext> {
  const clock = new TestClock();
  const sms = new FakeSms();
  const push = new FakePush();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ClockService)
    .useValue(clock)
    .overrideProvider(SmsSender)
    .useValue(sms)
    .overrideProvider(PushSender)
    .useValue(push)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: ['error', 'warn'] });
  configureApp(app);
  if (opts.swagger) setupSwagger(app);
  await app.init();

  const db = app.get(DataSource);
  await db.runMigrations();

  const tables = db.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  return {
    app,
    http: () => request(app.getHttpServer()),
    clock,
    sms,
    push,
    db,
    reset: async () => {
      await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
      clock.set(NOW);
      sms.messages = [];
      push.messages = [];
      push.invalid.clear();
    },
    close: () => app.close(),
  };
}
