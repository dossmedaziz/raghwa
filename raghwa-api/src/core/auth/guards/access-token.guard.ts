import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { unauthorized } from '../../../common/errors/domain.exception';
import type { Audience, AuthenticatedRequest } from '../auth.types';
import { TokensService } from '../tokens.service';

// @Injectable on the base too, so its constructor parameter types are emitted for Nest's injector.
@Injectable()
abstract class AccessTokenGuard implements CanActivate {
  protected abstract readonly audience: Audience;

  constructor(private readonly tokens: TokensService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('MISSING_ACCESS_TOKEN', 'Missing bearer token');
    const payload = await this.tokens.verifyAccess(this.audience, token);
    req.auth = { sub: payload.sub, aud: payload.aud };
    return true;
  }
}

/** Accepts only tokens issued to garage owners (garage-web). */
@Injectable()
export class OwnerAuthGuard extends AccessTokenGuard {
  protected readonly audience = 'owner';
}

/** Accepts only tokens issued to customers (mobile app). */
@Injectable()
export class CustomerAuthGuard extends AccessTokenGuard {
  protected readonly audience = 'customer';
}
