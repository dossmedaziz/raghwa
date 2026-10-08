import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsString, Length, MaxLength } from 'class-validator';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { PhoneField, Trim } from '../../../common/validation/decorators';
import { CustomerAuthService } from '../../../core/auth/customer-auth.service';
import { TokensService } from '../../../core/auth/tokens.service';
import { RefreshTokenDto, TokenPairDto } from '../../shared/auth.dto';
import { CustomerDto } from '../account/customer-account.dto';

export class CustomerRegisterDto {
  @ApiProperty({ example: 'Ahmed Ben Salah', minLength: 2, maxLength: 100 })
  @Trim() @IsString() @Length(2, 100)
  name: string;

  @PhoneField() phone: string;

  @ApiProperty({ example: 'raghwa2026', minLength: 8, maxLength: 72 })
  @IsString() @Length(8, 72)
  password: string;
}

export class CustomerLoginDto {
  @PhoneField() phone: string;

  @ApiProperty({ example: 'raghwa2026' })
  @IsString() @MaxLength(72)
  password: string;
}

export class CustomerSessionDto {
  @ApiProperty({ type: CustomerDto }) customer: CustomerDto;
  @ApiProperty({ type: TokenPairDto }) tokens: TokenPairDto;
}

@ApiTags('Auth')
@Controller('v1/auth')
export class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and log in', description: 'Phone + password; the phone number is not verified.' })
  @ApiCreatedResponse({ type: CustomerSessionDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`PHONE_TAKEN`' })
  async register(@Body() dto: CustomerRegisterDto): Promise<CustomerSessionDto> {
    const { customer, tokens } = await this.auth.register(dto.name, dto.phone, dto.password);
    return { customer: CustomerDto.from(customer), tokens: TokenPairDto.from(tokens) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with phone number and password' })
  @ApiOkResponse({ type: CustomerSessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: '`INVALID_CREDENTIALS`' })
  async login(@Body() dto: CustomerLoginDto): Promise<CustomerSessionDto> {
    const { customer, tokens } = await this.auth.login(dto.phone, dto.password);
    return { customer: CustomerDto.from(customer), tokens: TokenPairDto.from(tokens) };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new token pair', description: 'The refresh token is single-use; reusing an old one ends every session.' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: '`INVALID_REFRESH_TOKEN`' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    return TokenPairDto.from(await this.tokens.rotate('customer', dto.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out this device' })
  @ApiNoContentResponse()
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.tokens.revoke('customer', dto.refreshToken);
  }
}
