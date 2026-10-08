import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { randomDigits, sha256 } from '../../common/crypto/tokens';
import { tooManyRequests, unprocessable } from '../../common/errors/domain.exception';
import type { Env } from '../../config/env.validation';
import { SmsSender } from '../sms/sms-sender';
import { OtpCode, type OtpPurpose } from './entities/otp-code.entity';

/** 4 digits, as in both apps' OTP screens. Brute force is limited by OTP_MAX_ATTEMPTS and the resend cooldown. */
export const OTP_LENGTH = 4;

const MESSAGES: Record<OtpPurpose, (code: string) => string> = {
  owner_signup: (c) => `Raghwa Pro: كود التأكيد متاعك ${c} / Votre code de vérification : ${c}`,
  owner_reset: (c) => `Raghwa Pro: كود تبديل كلمة السر ${c} / Code de réinitialisation : ${c}`,
  owner_phone: (c) => `Raghwa Pro: كود تأكيد النومرو الجديد ${c} / Code pour confirmer le nouveau numéro : ${c}`,
  customer_login: (c) => `Raghwa: الكود متاعك ${c} / Votre code : ${c}`,
};

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode) private readonly codes: Repository<OtpCode>,
    private readonly sms: SmsSender,
    private readonly clock: ClockService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get settings() {
    const c = this.config;
    return {
      ttl: c.get('OTP_TTL_SECONDS', { infer: true }),
      maxAttempts: c.get('OTP_MAX_ATTEMPTS', { infer: true }),
      cooldown: c.get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }),
    };
  }

  /** Creates a new code (invalidating older ones) and texts it. Enforces a resend cooldown per phone + purpose. */
  async send(phone: string, purpose: OtpPurpose): Promise<void> {
    const now = this.clock.now();
    const { ttl, cooldown } = this.settings;

    const last = await this.codes.findOne({ where: { phone, purpose }, order: { createdAt: 'DESC' } });
    if (last) {
      const wait = Math.ceil((last.createdAt.getTime() + cooldown * 1000 - now.getTime()) / 1000);
      if (wait > 0) {
        throw tooManyRequests('OTP_COOLDOWN', `Wait ${wait}s before requesting another code`, { retryAfterSeconds: wait });
      }
    }

    await this.codes.update({ phone, purpose, consumedAt: IsNull() }, { consumedAt: now });
    const code = randomDigits(OTP_LENGTH);
    await this.codes.insert({
      phone,
      purpose,
      codeHash: this.hash(phone, purpose, code),
      expiresAt: new Date(now.getTime() + ttl * 1000),
      attempts: 0,
      consumedAt: null,
      createdAt: now,
    });
    await this.sms.send(phone, MESSAGES[purpose](code));
  }

  /** Consumes the latest code if it matches. Throws OTP_INVALID / OTP_EXPIRED / OTP_TOO_MANY_ATTEMPTS otherwise. */
  async verify(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    const now = this.clock.now();
    const otp = await this.codes.findOne({ where: { phone, purpose, consumedAt: IsNull() }, order: { createdAt: 'DESC' } });
    if (!otp) throw unprocessable('OTP_INVALID', 'Invalid code');
    if (otp.expiresAt <= now) throw unprocessable('OTP_EXPIRED', 'This code has expired, request a new one');

    const { maxAttempts } = this.settings;
    if (otp.attempts >= maxAttempts) {
      throw tooManyRequests('OTP_TOO_MANY_ATTEMPTS', 'Too many wrong attempts, request a new code');
    }
    if (otp.codeHash !== this.hash(phone, purpose, code)) {
      otp.attempts += 1;
      await this.codes.save(otp);
      throw unprocessable('OTP_INVALID', 'Invalid code', { remainingAttempts: Math.max(0, maxAttempts - otp.attempts) });
    }

    otp.consumedAt = now;
    await this.codes.save(otp);
  }

  private hash(phone: string, purpose: OtpPurpose, code: string) {
    return sha256(`${purpose}:${phone}:${code}`);
  }
}
