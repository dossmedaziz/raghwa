import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { notFound } from '../../common/errors/domain.exception';
import { CustomerCar } from './customer-car.entity';

export type CarData = Pick<CustomerCar, 'brand' | 'model' | 'plate'>;

/** Each customer's saved cars; keeps exactly one default car while there are any. */
@Injectable()
export class CustomerCarsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Default car first, then oldest first. */
  list(customerId: string): Promise<CustomerCar[]> {
    return this.db.getRepository(CustomerCar).find({ where: { customerId }, order: { isDefault: 'DESC', createdAt: 'ASC', id: 'ASC' } });
  }

  async get(customerId: string, id: string, m: EntityManager = this.db.manager): Promise<CustomerCar> {
    const car = await m.findOneBy(CustomerCar, { customerId, id });
    if (!car) throw notFound('CAR_NOT_FOUND', 'Car not found');
    return car;
  }

  /** The first car becomes the default one. */
  create(customerId: string, data: CarData & { isDefault?: boolean }): Promise<CustomerCar> {
    return this.db.transaction(async (m) => {
      const isDefault = data.isDefault || !(await m.existsBy(CustomerCar, { customerId }));
      if (isDefault) await m.update(CustomerCar, { customerId }, { isDefault: false });
      return m.save(m.create(CustomerCar, { ...data, customerId, isDefault }));
    });
  }

  /** `isDefault: true` moves the default here; a car stops being the default only when another one takes it. */
  update(customerId: string, id: string, data: Partial<CarData> & { isDefault?: boolean }): Promise<CustomerCar> {
    return this.db.transaction(async (m) => {
      const car = await this.get(customerId, id, m);
      const { isDefault, ...fields } = data;
      Object.assign(car, fields);
      if (isDefault && !car.isDefault) {
        await m.update(CustomerCar, { customerId }, { isDefault: false });
        car.isDefault = true;
      }
      return m.save(car);
    });
  }

  /** Deleting the default car hands the default to the oldest remaining one. */
  remove(customerId: string, id: string): Promise<void> {
    return this.db.transaction(async (m) => {
      const car = await this.get(customerId, id, m);
      await m.remove(car);
      if (!car.isDefault) return;
      const next = await m.findOne(CustomerCar, { where: { customerId }, order: { createdAt: 'ASC', id: 'ASC' } });
      if (next) await m.update(CustomerCar, { id: next.id }, { isDefault: true });
    });
  }
}
