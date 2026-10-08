import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { notFound } from '../../common/errors/domain.exception';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { GaragesService } from './garages.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs after OwnerAuthGuard on every `/owner/garages/:garageId/...` route: the garage must belong to the
 * logged-in owner. Someone else's garage answers 404 (not 403) so ids of other garages are not confirmed.
 */
@Injectable()
export class GarageOwnershipGuard implements CanActivate {
  constructor(private readonly garages: GaragesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const garageId = req.params.garageId;
    const ownerId = req.auth?.sub;
    if (typeof garageId !== 'string' || !ownerId || !UUID_RE.test(garageId) || !(await this.garages.isOwnedBy(garageId, ownerId))) {
      throw notFound('GARAGE_NOT_FOUND', 'Garage not found');
    }
    return true;
  }
}
