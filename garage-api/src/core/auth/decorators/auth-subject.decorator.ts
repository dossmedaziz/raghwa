import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth.types';

/** The authenticated owner's or customer's id (set by OwnerAuthGuard / CustomerAuthGuard). */
export const AuthSubject = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.auth) throw new Error('AuthSubject used on a route without an auth guard');
  return req.auth.sub;
});
