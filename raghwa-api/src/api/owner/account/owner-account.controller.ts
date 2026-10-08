import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags,
  ApiTooManyRequestsResponse, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import type { Env } from '../../../config/env.validation';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { OwnerAuthService } from '../../../core/auth/owner-auth.service';
import { OwnersService } from '../../../core/owners/owners.service';
import { OtpSentDto, PhoneDto, VerifyCodeDto } from '../../shared/auth.dto';
import { ChangePasswordDto, OwnerDto, UpdateNotificationPrefsDto, UpdateOwnerDto } from './owner-account.dto';

@ApiTags('Owner · Account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid owner access token' })
@UseGuards(OwnerAuthGuard)
@Controller('v1/owner/me')
export class OwnerAccountController {
  constructor(
    private readonly owners: OwnersService,
    private readonly auth: OwnerAuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Current owner' })
  @ApiOkResponse({ type: OwnerDto })
  async me(@AuthSubject() ownerId: string): Promise<OwnerDto> {
    return OwnerDto.from(await this.owners.get(ownerId));
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile' })
  @ApiOkResponse({ type: OwnerDto })
  async update(@AuthSubject() ownerId: string, @Body() dto: UpdateOwnerDto): Promise<OwnerDto> {
    return OwnerDto.from(await this.owners.updateProfile(ownerId, dto));
  }

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password' })
  @ApiNoContentResponse()
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`WRONG_PASSWORD`' })
  async changePassword(@AuthSubject() ownerId: string, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.owners.changePassword(ownerId, dto.currentPassword, dto.newPassword);
  }

  @Post('phone')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Change phone number, step 1/2: text a code to the new number' })
  @ApiAcceptedResponse({ type: OtpSentDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`PHONE_TAKEN`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`SAME_PHONE`' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: '`OTP_COOLDOWN`' })
  async requestPhoneChange(@AuthSubject() ownerId: string, @Body() dto: PhoneDto): Promise<OtpSentDto> {
    await this.auth.requestPhoneChange(ownerId, dto.phone);
    return { phone: dto.phone, resendAfterSeconds: this.config.get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }) };
  }

  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change phone number, step 2/2: confirm the code' })
  @ApiOkResponse({ type: OwnerDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`PHONE_TAKEN`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`OTP_INVALID`, `OTP_EXPIRED`, `SAME_PHONE`' })
  async confirmPhoneChange(@AuthSubject() ownerId: string, @Body() dto: VerifyCodeDto): Promise<OwnerDto> {
    return OwnerDto.from(await this.auth.confirmPhoneChange(ownerId, dto.phone, dto.code));
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update SMS notification preferences' })
  @ApiOkResponse({ type: OwnerDto })
  async notifications(@AuthSubject() ownerId: string, @Body() dto: UpdateNotificationPrefsDto): Promise<OwnerDto> {
    const owner = await this.owners.updateNotificationPrefs(ownerId, {
      ...(dto.newBooking !== undefined ? { notifyNewBooking: dto.newBooking } : {}),
      ...(dto.cancellation !== undefined ? { notifyCancellation: dto.cancellation } : {}),
      ...(dto.reschedule !== undefined ? { notifyReschedule: dto.reschedule } : {}),
      ...(dto.dailySummary !== undefined ? { notifyDailySummary: dto.dailySummary } : {}),
    });
    return OwnerDto.from(owner);
  }
}
