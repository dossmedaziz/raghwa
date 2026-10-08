import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { notFound, unprocessable } from '../../common/errors/domain.exception';
import type { DayHoursLike } from '../../common/time/time.utils';
import { CatalogService } from '../catalog/catalog.service';
import { GarageHours } from './entities/garage-hours.entity';
import { Garage } from './entities/garage.entity';
import { DEFAULT_WEEK, hoursProblem, missingForPublish } from './garage-rules';

export type GarageProfile = Pick<
  Garage,
  'name' | 'description' | 'phone' | 'address' | 'area' | 'city' | 'latitude' | 'longitude' | 'slotDurationMinutes' | 'capacity'
>;

export interface GarageSearch {
  q?: string;
  city?: string;
  near?: { lat: number; lng: number; radiusKm: number };
  skip: number;
  take: number;
}

export type GarageWithHours = Garage & { hours: GarageHours[] };

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);
const POINT = 'ST_SetSRID(ST_MakePoint(g.longitude, g.latitude), 4326)::geography';
const ORIGIN = 'ST_SetSRID(ST_MakePoint(CAST(:lng AS double precision), CAST(:lat AS double precision)), 4326)::geography';

@Injectable()
export class GaragesService {
  constructor(
    @InjectRepository(Garage) private readonly garages: Repository<Garage>,
    @InjectRepository(GarageHours) private readonly hours: Repository<GarageHours>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly catalog: CatalogService,
    private readonly clock: ClockService,
  ) {}

  /* ───────── owner side ───────── */

  async isOwnedBy(garageId: string, ownerId: string): Promise<boolean> {
    return this.garages.existsBy({ id: garageId, ownerId });
  }

  listForOwner(ownerId: string): Promise<Garage[]> {
    return this.garages.find({ where: { ownerId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }

  /** New garages are drafts with the default week; the owner completes them through onboarding. */
  async create(ownerId: string, data: Partial<GarageProfile>): Promise<GarageWithHours> {
    const id = await this.db.transaction(async (m) => {
      const garage = await m.save(m.create(Garage, { ...data, ownerId, status: 'draft' }));
      await m.insert(GarageHours, DEFAULT_WEEK.map((h, dayOfWeek) => ({ ...h, dayOfWeek, garageId: garage.id })));
      return garage.id;
    });
    return this.getWithHours(id);
  }

  async getWithHours(garageId: string): Promise<GarageWithHours> {
    const garage = await this.garages.findOne({ where: { id: garageId }, relations: { hours: true } });
    if (!garage) throw notFound('GARAGE_NOT_FOUND', 'Garage not found');
    garage.hours = (garage.hours ?? []).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    return garage as GarageWithHours;
  }

  async update(garageId: string, data: Partial<GarageProfile>): Promise<GarageWithHours> {
    const garage = await this.getWithHours(garageId);
    const next = { ...garage, ...data };
    if ((next.latitude === null) !== (next.longitude === null)) {
      throw unprocessable('INVALID_LOCATION', 'latitude and longitude must be set together');
    }
    if (garage.status === 'published') {
      const missing = missingForPublish(next, garage.hours, 1);
      if (missing.length) {
        throw unprocessable('GARAGE_INCOMPLETE', 'A published garage cannot lose required details', { missing });
      }
    }
    if (Object.keys(data).length) await this.garages.update({ id: garageId }, data);
    return this.getWithHours(garageId);
  }

  /** Replaces the whole week (exactly 7 days, Monday first). */
  async setHours(garageId: string, week: DayHoursLike[]): Promise<GarageWithHours> {
    const problems = week
      .map((h, day) => ({ day, problem: hoursProblem(h) }))
      .filter((p): p is { day: number; problem: string } => p.problem !== null);
    if (problems.length) throw unprocessable('INVALID_HOURS', 'Some days have inconsistent hours', { problems });

    const garage = await this.getWithHours(garageId);
    if (garage.status === 'published' && !week.some((h) => h.isOpen)) {
      throw unprocessable('GARAGE_INCOMPLETE', 'A published garage must be open at least one day', { missing: ['hours'] });
    }
    await this.db.transaction(async (m) => {
      for (const [dayOfWeek, h] of week.entries()) {
        await m.update(GarageHours, { garageId, dayOfWeek }, { ...h });
      }
    });
    return this.getWithHours(garageId);
  }

  async publish(garageId: string): Promise<GarageWithHours> {
    const garage = await this.getWithHours(garageId);
    const missing = missingForPublish(garage, garage.hours, await this.catalog.countActive(garageId));
    if (missing.length) throw unprocessable('GARAGE_INCOMPLETE', 'Complete the garage profile before publishing', { missing });
    if (garage.status !== 'published') {
      await this.garages.update({ id: garageId }, { status: 'published', publishedAt: this.clock.now() });
    }
    return this.getWithHours(garageId);
  }

  async unpublish(garageId: string): Promise<GarageWithHours> {
    await this.garages.update({ id: garageId }, { status: 'draft' });
    return this.getWithHours(garageId);
  }

  getWithOwner(garageId: string): Promise<Garage | null> {
    return this.garages.findOne({ where: { id: garageId }, relations: { owner: true } });
  }

  /* ───────── customer side ───────── */

  async getPublished(garageId: string): Promise<GarageWithHours> {
    const garage = await this.garages.findOne({ where: { id: garageId, status: 'published' }, relations: { hours: true } });
    if (!garage) throw notFound('GARAGE_NOT_FOUND', 'Garage not found');
    garage.hours = (garage.hours ?? []).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    return garage as GarageWithHours;
  }

  /** Published garages, optionally filtered by text, city and distance (nearest first when a position is given). */
  async searchPublished(s: GarageSearch): Promise<{ items: { garage: Garage; distanceMeters: number | null }[]; total: number }> {
    const qb = this.garages.createQueryBuilder('g').where('g.status = :status', { status: 'published' });
    if (s.city) qb.andWhere('g.city = :city', { city: s.city });
    if (s.q) {
      qb.andWhere('(g.name ILIKE :q OR g.area ILIKE :q OR g.address ILIKE :q)', { q: `%${escapeLike(s.q)}%` });
    }
    if (s.near) {
      qb.andWhere('g.latitude IS NOT NULL AND g.longitude IS NOT NULL')
        .andWhere(`ST_DWithin(${POINT}, ${ORIGIN}, :radius)`, { lat: s.near.lat, lng: s.near.lng, radius: s.near.radiusKm * 1000 })
        .addSelect(`ST_Distance(${POINT}, ${ORIGIN})`, 'distance_m')
        .orderBy('distance_m', 'ASC');
    } else {
      qb.orderBy('g.publishedAt', 'DESC');
    }
    qb.addOrderBy('g.id', 'ASC');

    const total = await qb.getCount();
    const { entities, raw } = await qb.offset(s.skip).limit(s.take).getRawAndEntities<{ distance_m?: number | string }>();
    return {
      total,
      items: entities.map((garage, i) => ({
        garage,
        distanceMeters: s.near && raw[i]?.distance_m != null ? Math.round(Number(raw[i].distance_m)) : null,
      })),
    };
  }
}
