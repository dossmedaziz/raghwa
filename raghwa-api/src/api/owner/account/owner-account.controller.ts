import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { OwnersService } from '../../../core/owners/owners.service';
import { ChangePasswordDto, OwnerDto, UpdateNotificationPrefsDto, UpdateOwnerDto } from './owner-account.dto';

@ApiTags('Owner · Account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid owner access token' })
@UseGuards(OwnerAuthGuard)
@Controller('v1/owner/me')
export class OwnerAccountController {
  constructor(private readonly owners: OwnersService) {}

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
