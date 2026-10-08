import { ConfigService } from '@nestjs/config';
import type { Env } from './env.validation';

/** Typed ConfigService: `config.get('PORT', { infer: true })` returns a number. */
export type AppConfig = ConfigService<Env, true>;
