import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '../../../common/validation/decorators';
import type { Customer } from '../../../core/customers/customer.entity';

export class CustomerDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '22345671' }) phone: string;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Ahmed Ben Salah' }) name: string | null;

  static from(c: Customer): CustomerDto {
    return { id: c.id, phone: c.phone, name: c.name };
  }
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Ahmed Ben Salah', minLength: 2, maxLength: 100 })
  @IsOptional() @Trim() @IsString() @Length(2, 100)
  name?: string;
}
