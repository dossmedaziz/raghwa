import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { randomToken, sha256 } from '../../common/crypto/tokens';
import { unauthorized } from '../../common/errors/domain.exception';
import type { Env } from '../../config/env.validation';
import type { AccessTokenPayload, Audience } from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

const RESET_AUDIENCE = 'owner-password-reset';

/**
 * JWT access tokens (short-lived, one signing secret per audience) and opaque refresh tokens
 * (stored hashed, rotated on every use; reusing an old one revokes every session of that account).
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly clock: ClockService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get cfg() {
    return this.config;
  }

  private secret(aud: Audience) {
    return aud === 'owner' ? this.cfg.get('JWT_OWNER_SECRET', { infer: true }) : this.cfg.get('JWT_CUSTOMER_SECRET', { infer: true });
  }

  async issue(aud: Audience, subjectId: string): Promise<TokenPair> {
    const expiresIn = this.cfg.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const accessToken = await this.jwt.signAsync({ sub: subjectId }, { secret: this.secret(aud), audience: aud, expiresIn });
    const refreshToken = randomToken();
    const days = this.cfg.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.refreshTokens.insert({
      audience: aud,
      subjectId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(this.clock.now().getTime() + days * 86_400_000),
      revokedAt: null,
    });
    return { accessToken, refreshToken, expiresIn };
  }

  async verifyAccess(aud: Audience, token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.secret(aud), audience: aud });
      return { sub: payload.sub, aud };
    } catch {
      throw unauthorized('INVALID_ACCESS_TOKEN', 'Invalid or expired access token');
    }
  }

  /** Exchanges a refresh token for a new pair. The old refresh token stops working. */
  async rotate(aud: Audience, refreshToken: string): Promise<TokenPair> {
    const now = this.clock.now();
    const row = await this.refreshTokens.findOne({ where: { tokenHash: sha256(refreshToken), audience: aud } });
    if (!row) throw unauthorized('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    if (row.revokedAt) {
      // A rotated token was used again: it may have been stolen. End every session of this account.
      await this.revokeAll(aud, row.subjectId);
      throw unauthorized('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
    if (row.expiresAt <= now) throw unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token expired');

    const { affected } = await this.refreshTokens.update({ id: row.id, revokedAt: IsNull() }, { revokedAt: now });
    if (!affected) throw unauthorized('INVALID_REFRESH_TOKEN', 'Invalid refresh token'); // lost a concurrent rotation
    return this.issue(aud, row.subjectId);
  }

  async revoke(aud: Audience, refreshToken: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: sha256(refreshToken), audience: aud, revokedAt: IsNull() },
      { revokedAt: this.clock.now() },
    );
  }

  async revokeAll(aud: Audience, subjectId: string): Promise<void> {
    await this.refreshTokens.update({ audience: aud, subjectId, revokedAt: IsNull() }, { revokedAt: this.clock.now() });
  }

  /** Short-lived token proving an owner passed the password-reset OTP. */
  signPasswordReset(ownerId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: ownerId },
      { secret: this.cfg.get('JWT_RESET_SECRET', { infer: true }), audience: RESET_AUDIENCE, expiresIn: 600 },
    );
  }

  async verifyPasswordReset(token: string): Promise<string> {
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.cfg.get('JWT_RESET_SECRET', { infer: true }),
        audience: RESET_AUDIENCE,
      });
      return sub;
    } catch {
      throw unauthorized('INVALID_RESET_TOKEN', 'Invalid or expired reset token');
    }
  }
}
