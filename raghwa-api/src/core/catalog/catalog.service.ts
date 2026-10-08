import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { notFound } from '../../common/errors/domain.exception';
import { WashService } from './wash-service.entity';

export type ServiceData = Pick<WashService, 'nameAr' | 'nameFr' | 'descriptionAr' | 'descriptionFr' | 'priceMillimes' | 'isActive'>;

/** Each garage's own list of services and prices. */
@Injectable()
export class CatalogService {
  constructor(@InjectRepository(WashService) private readonly services: Repository<WashService>) {}

  list(garageId: string, opts: { activeOnly?: boolean } = {}): Promise<WashService[]> {
    return this.services.find({
      where: { garageId, ...(opts.activeOnly ? { isActive: true } : {}) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async get(garageId: string, id: string): Promise<WashService> {
    const service = await this.services.findOneBy({ garageId, id });
    if (!service) throw notFound('SERVICE_NOT_FOUND', 'Service not found');
    return service;
  }

  create(garageId: string, data: ServiceData): Promise<WashService> {
    return this.services.save(this.services.create({ ...data, garageId }));
  }

  async update(garageId: string, id: string, data: Partial<ServiceData>): Promise<WashService> {
    const service = await this.get(garageId, id);
    Object.assign(service, data);
    return this.services.save(service);
  }

  /** Past reservations keep their copied name and price (their service_id becomes null). */
  async remove(garageId: string, id: string): Promise<void> {
    const service = await this.get(garageId, id);
    await this.services.remove(service);
  }

  countActive(garageId: string): Promise<number> {
    return this.services.countBy({ garageId, isActive: true });
  }

  /** Lowest active price per garage, in millimes (for the "from …" label in the app). */
  async minActivePrices(garageIds: string[]): Promise<Map<string, number>> {
    if (!garageIds.length) return new Map();
    const rows = await this.services
      .createQueryBuilder('s')
      .select('s.garageId', 'garageId')
      .addSelect('MIN(s.priceMillimes)', 'min')
      .where({ garageId: In(garageIds), isActive: true })
      .groupBy('s.garageId')
      .getRawMany<{ garageId: string; min: number | string }>();
    return new Map(rows.map((r) => [r.garageId, Number(r.min)]));
  }
}
