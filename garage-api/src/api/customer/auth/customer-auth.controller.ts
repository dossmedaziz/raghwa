import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags, ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import type { AppConfig } from '../../../config/app-config';
import { CustomerAuthService } from '../../../core/auth/customer-auth.service';
import { TokensService } from '../../../core/auth/tokens.service';
import { OtpSentDto, PhoneDto, RefreshTokenDto, TokenPairDto, VerifyCodeDto } from '../../shared/auth.dto';
import { CustomerDto } from '../account/customer-account.dto';

export class CustomerSessionDto {
  @ApiProperty({ type: CustomerDto }) customer: CustomerDto;
  @ApiProperty({ description: 'True until the customer has set a name: show the profile step.' }) isNew: boolean;
  @ApiProperty({ type: TokenPairDto }) tokens: TokenPairDto;
}

@ApiTags('Auth')
@Controller('v1/auth')
export class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
  ) {}

  @Post('otp')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Text a login code', description: 'Works for new and existing customers alike.' })
  @ApiAcceptedResponse({ type: OtpSentDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_COOLDOWN` (details.retryAfterSeconds)' })
  async requestCode(@Body() dto: PhoneDto): Promise<OtpSentDto> {
    await this.auth.requestCode(dto.phone);
    return { phone: dto.phone, resendAfterSeconds: (this.config as AppConfig).get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }) };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with the code', description: 'Creates the account on first login.' })
  @ApiOkResponse({ type: CustomerSessionDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`OTP_INVALID`, `OTP_EXPIRED`' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_TOO_MANY_ATTEMPTS`' })
  async verify(@Body() dto: VerifyCodeDto): Promise<CustomerSessionDto> {
    const { customer, isNew, tokens } = await this.auth.verifyCode(dto.phone, dto.code);
    return { customer: CustomerDto.from(customer), isNew, tokens: TokenPairDto.from(tokens) };
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
