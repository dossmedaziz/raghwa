import { Injectable } from '@nestjs/common';
import { ClockService } from '../../common/clock/clock.service';
import { verifyPassword } from '../../common/crypto/password';
import { conflict, forbidden, unauthorized, unprocessable } from '../../common/errors/domain.exception';
import type { Owner } from '../owners/owner.entity';
import { OwnersService } from '../owners/owners.service';
import { OtpService } from './otp.service';
import { TokensService, type TokenPair } from './tokens.service';

/** Garage-owner sign-up (phone + password, confirmed by SMS), login and password reset. */
@Injectable()
export class OwnerAuthService {
  constructor(
    private readonly owners: OwnersService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly clock: ClockService,
  ) {}

  async signup(name: string, phone: string, password: string): Promise<void> {
    const existing = await this.owners.findByPhone(phone);
    if (existing?.phoneVerifiedAt) throw conflict('PHONE_TAKEN', 'An account already exists for this phone number');
    await this.owners.upsertUnverified(name, phone, password);
    await this.otp.send(phone, 'owner_signup');
  }

  async resendSignupCode(phone: string): Promise<void> {
    const owner = await this.owners.findByPhone(phone);
    if (!owner || owner.phoneVerifiedAt) throw unprocessable('NO_PENDING_SIGNUP', 'No pending sign-up for this phone number');
    await this.otp.send(phone, 'owner_signup');
  }

  async verifySignup(phone: string, code: string): Promise<{ owner: Owner; tokens: TokenPair }> {
    const owner = await this.owners.findByPhone(phone);
    if (!owner || owner.phoneVerifiedAt) throw unprocessable('NO_PENDING_SIGNUP', 'No pending sign-up for this phone number');
    await this.otp.verify(phone, 'owner_signup', code);
    const verified = await this.owners.markVerified(owner, this.clock.now());
    return { owner: verified, tokens: await this.tokens.issue('owner', owner.id) };
  }

  async login(phone: string, password: string): Promise<{ owner: Owner; tokens: TokenPair }> {
    const owner = await this.owners.findByPhone(phone);
    if (!owner || !(await verifyPassword(password, owner.passwordHash))) {
      throw unauthorized('INVALID_CREDENTIALS', 'Wrong phone number or password');
    }
    if (!owner.phoneVerifiedAt) throw forbidden('PHONE_NOT_VERIFIED', 'Confirm your phone number first');
    return { owner, tokens: await this.tokens.issue('owner', owner.id) };
  }

  /** Always succeeds silently for unknown numbers, so the endpoint does not reveal who has an account. */
  async requestPasswordReset(phone: string): Promise<void> {
    const owner = await this.owners.findByPhone(phone);
    if (owner?.phoneVerifiedAt) await this.otp.send(phone, 'owner_reset');
  }

  async verifyPasswordReset(phone: string, code: string): Promise<string> {
    const owner = await this.owners.findByPhone(phone);
    if (!owner?.phoneVerifiedAt) throw unprocessable('OTP_INVALID', 'Invalid code');
    await this.otp.verify(phone, 'owner_reset', code);
    return this.tokens.signPasswordReset(owner.id);
  }

  /** Sets the new password and signs the owner out everywhere. */
  async resetPassword(resetToken: string, password: string): Promise<void> {
    const ownerId = await this.tokens.verifyPasswordReset(resetToken);
    await this.owners.setPassword(ownerId, password);
    await this.tokens.revokeAll('owner', ownerId);
  }
}
