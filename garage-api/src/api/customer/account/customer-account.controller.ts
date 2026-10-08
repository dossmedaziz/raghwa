import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { CustomerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { CustomersService } from '../../../core/customers/customers.service';
import { CustomerDto, UpdateCustomerDto } from './customer-account.dto';

@ApiTags('Account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid customer access token' })
@UseGuards(CustomerAuthGuard)
@Controller('v1/me')
export class CustomerAccountController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Current customer' })
  @ApiOkResponse({ type: CustomerDto })
  async me(@AuthSubject() customerId: string): Promise<CustomerDto> {
    return CustomerDto.from(await this.customers.get(customerId));
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile (name)' })
  @ApiOkResponse({ type: CustomerDto })
  async update(@AuthSubject() customerId: string, @Body() dto: UpdateCustomerDto): Promise<CustomerDto> {
    return CustomerDto.from(await this.customers.updateProfile(customerId, dto));
  }
}
