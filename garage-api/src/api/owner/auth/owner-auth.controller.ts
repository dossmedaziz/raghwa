import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse, ApiConflictResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation,
  ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import type { AppConfig } from '../../../config/app-config';
import { OwnerAuthService } from '../../../core/auth/owner-auth.service';
import { TokensService } from '../../../core/auth/tokens.service';
import { OtpSentDto, PhoneDto, RefreshTokenDto, TokenPairDto, VerifyCodeDto } from '../../shared/auth.dto';
import { OwnerDto } from '../account/owner-account.dto';
import { OwnerLoginDto, OwnerSessionDto, OwnerSignupDto, PasswordResetTokenDto, ResetPasswordDto } from './owner-auth.dto';

@ApiTags('Owner · Auth')
@Controller('v1/owner/auth')
export class OwnerAuthController {
  constructor(
    private readonly auth: OwnerAuthService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
  ) {}

  private sent(phone: string): OtpSentDto {
    return { phone, resendAfterSeconds: (this.config as AppConfig).get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }) };
  }

  @Post('signup')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create an account', description: 'Texts a code to confirm the phone number. The account is usable after /signup/verify.' })
  @ApiAcceptedResponse({ type: OtpSentDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`PHONE_TAKEN`' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_COOLDOWN`' })
  async signup(@Body() dto: OwnerSignupDto): Promise<OtpSentDto> {
    await this.auth.signup(dto.name, dto.phone, dto.password);
    return this.sent(dto.phone);
  }

  @Post('signup/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send the sign-up code again' })
  @ApiAcceptedResponse({ type: OtpSentDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`NO_PENDING_SIGNUP`' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_COOLDOWN`' })
  async resend(@Body() dto: PhoneDto): Promise<OtpSentDto> {
    await this.auth.resendSignupCode(dto.phone);
    return this.sent(dto.phone);
  }

  @Post('signup/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm the phone number and log in' })
  @ApiOkResponse({ type: OwnerSessionDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`OTP_INVALID`, `OTP_EXPIRED`, `NO_PENDING_SIGNUP`' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_TOO_MANY_ATTEMPTS`' })
  async verify(@Body() dto: VerifyCodeDto): Promise<OwnerSessionDto> {
    const { owner, tokens } = await this.auth.verifySignup(dto.phone, dto.code);
    return { owner: OwnerDto.from(owner), tokens: TokenPairDto.from(tokens) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with phone number and password' })
  @ApiOkResponse({ type: OwnerSessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: '`INVALID_CREDENTIALS`' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: '`PHONE_NOT_VERIFIED`' })
  async login(@Body() dto: OwnerLoginDto): Promise<OwnerSessionDto> {
    const { owner, tokens } = await this.auth.login(dto.phone, dto.password);
    return { owner: OwnerDto.from(owner), tokens: TokenPairDto.from(tokens) };
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Forgot password, step 1/3: text a code',
    description: 'Answers the same way whether or not the number has an account.',
  })
  @ApiAcceptedResponse({ type: OtpSentDto })
  async forgot(@Body() dto: PhoneDto): Promise<OtpSentDto> {
    await this.auth.requestPasswordReset(dto.phone);
    return this.sent(dto.phone);
  }

  @Post('password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot password, step 2/3: check the code' })
  @ApiOkResponse({ type: PasswordResetTokenDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`OTP_INVALID`, `OTP_EXPIRED`' })
  async verifyReset(@Body() dto: VerifyCodeDto): Promise<PasswordResetTokenDto> {
    return { resetToken: await this.auth.verifyPasswordReset(dto.phone, dto.code) };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Forgot password, step 3/3: set the new password', description: 'Also logs the owner out of every device.' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: '`INVALID_RESET_TOKEN`' })
  async reset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.resetToken, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new token pair', description: 'The refresh token is single-use; reusing an old one ends every session.' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: '`INVALID_REFRESH_TOKEN`' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    return TokenPairDto.from(await this.tokens.rotate('owner', dto.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out this device (revokes the refresh token)' })
  @ApiNoContentResponse()
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.tokens.revoke('owner', dto.refreshToken);
  }
}
