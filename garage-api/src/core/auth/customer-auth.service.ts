import { Injectable } from '@nestjs/common';
import type { Customer } from '../customers/customer.entity';
import { CustomersService } from '../customers/customers.service';
import { OtpService } from './otp.service';
import { TokensService, type TokenPair } from './tokens.service';

/** Customers log in with their phone number and an SMS code only; the account is created on first login. */
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customers: CustomersService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
  ) {}

  requestCode(phone: string): Promise<void> {
    return this.otp.send(phone, 'customer_login');
  }

  async verifyCode(phone: string, code: string): Promise<{ customer: Customer; isNew: boolean; tokens: TokenPair }> {
    await this.otp.verify(phone, 'customer_login', code);
    const { customer } = await this.customers.findOrCreateByPhone(phone);
    // "New" until the customer has filled in their name, so the app knows to show the profile step.
    return { customer, isNew: !customer.name, tokens: await this.tokens.issue('customer', customer.id) };
  }
}
