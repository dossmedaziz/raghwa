import { Injectable } from '@nestjs/common';
import { verifyPassword } from '../../common/crypto/password';
import { unauthorized } from '../../common/errors/domain.exception';
import type { Customer } from '../customers/customer.entity';
import { CustomersService } from '../customers/customers.service';
import { TokensService, type TokenPair } from './tokens.service';

/** Customers register and log in with their phone number and a password (no SMS code for now). */
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customers: CustomersService,
    private readonly tokens: TokensService,
  ) {}

  async register(name: string, phone: string, password: string): Promise<{ customer: Customer; tokens: TokenPair }> {
    const customer = await this.customers.register(name, phone, password);
    return { customer, tokens: await this.tokens.issue('customer', customer.id) };
  }

  async login(phone: string, password: string): Promise<{ customer: Customer; tokens: TokenPair }> {
    const found = await this.customers.findByPhoneWithPassword(phone);
    if (!found?.passwordHash || !(await verifyPassword(password, found.passwordHash))) {
      throw unauthorized('INVALID_CREDENTIALS', 'Wrong phone number or password');
    }
    return { customer: await this.customers.get(found.id), tokens: await this.tokens.issue('customer', found.id) };
  }
}
