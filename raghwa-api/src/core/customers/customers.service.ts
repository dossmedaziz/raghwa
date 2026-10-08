import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../../common/crypto/password';
import { conflict, notFound } from '../../common/errors/domain.exception';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>) {}

  async get(id: string): Promise<Customer> {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw notFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    return customer;
  }

  /** With `passwordHash`, which is not selected by default. */
  findByPhoneWithPassword(phone: string): Promise<Customer | null> {
    return this.customers.createQueryBuilder('c').addSelect('c.passwordHash').where('c.phone = :phone', { phone }).getOne();
  }

  /**
   * Creates the account. An account left by the former SMS-code login (no password yet) is taken over:
   * phone numbers are not verified any more, so it is no different from a new sign-up.
   */
  async register(name: string, phone: string, password: string): Promise<Customer> {
    const passwordHash = await hashPassword(password);
    const existing = await this.findByPhoneWithPassword(phone);
    if (existing?.passwordHash) throw conflict('PHONE_TAKEN', 'An account already exists for this phone number');
    if (existing) {
      await this.customers.update({ id: existing.id }, { name, passwordHash });
      return this.get(existing.id);
    }
    // ON CONFLICT DO NOTHING: two sign-ups racing for the same phone, the second one gets PHONE_TAKEN.
    const { identifiers } = await this.customers.createQueryBuilder().insert().values({ phone, name, passwordHash }).orIgnore().execute();
    if (!identifiers[0]) throw conflict('PHONE_TAKEN', 'An account already exists for this phone number');
    return this.customers.findOneByOrFail({ phone });
  }

  async updateProfile(id: string, data: { name?: string }): Promise<Customer> {
    const customer = await this.get(id);
    if (data.name !== undefined) customer.name = data.name;
    return this.customers.save(customer);
  }
}
