import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { notFound } from '../../common/errors/domain.exception';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>) {}

  async get(id: string): Promise<Customer> {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw notFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    return customer;
  }

  /** Returns the customer for this phone, creating it on first login. */
  async findOrCreateByPhone(phone: string): Promise<{ customer: Customer; created: boolean }> {
    const existing = await this.customers.findOneBy({ phone });
    if (existing) return { customer: existing, created: false };
    // ON CONFLICT DO NOTHING covers two first-logins racing for the same phone.
    await this.customers.createQueryBuilder().insert().values({ phone, name: null }).orIgnore().execute();
    return { customer: await this.customers.findOneByOrFail({ phone }), created: true };
  }

  async updateProfile(id: string, data: { name?: string }): Promise<Customer> {
    const customer = await this.get(id);
    if (data.name !== undefined) customer.name = data.name;
    return this.customers.save(customer);
  }
}
