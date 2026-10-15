import { Body, Controller, Delete, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiProperty, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { CustomerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { PUSH_LANGS, type PushLang } from '../../../core/push/push-token.entity';
import { PushService } from '../../../core/push/push.service';

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[\w-]{1,180}\]$/;

export class PushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', description: 'From `getExpoPushTokenAsync()`.' })
  @IsString() @Matches(EXPO_TOKEN, { message: 'token must be an Expo push token' })
  token: string;
}

export class RegisterPushTokenDto extends PushTokenDto {
  @ApiProperty({ enum: PUSH_LANGS, description: 'App language: pushes are written in it. Send again when it changes.' })
  @IsIn(PUSH_LANGS)
  lang: PushLang;
}

@ApiTags('Push notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid customer access token' })
@UseGuards(CustomerAuthGuard)
@Controller('v1/me/push-token')
export class CustomerPushController {
  constructor(private readonly push: PushService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Receive push notifications on this phone',
    description: 'Idempotent. A token already registered by another account moves to this one (same phone, new login).',
  })
  @ApiNoContentResponse()
  async register(@AuthSubject() customerId: string, @Body() dto: RegisterPushTokenDto): Promise<void> {
    await this.push.register(customerId, dto.token, dto.lang);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stop push notifications on this phone', description: 'Call before logging out.' })
  @ApiNoContentResponse()
  async unregister(@AuthSubject() customerId: string, @Body() dto: PushTokenDto): Promise<void> {
    await this.push.unregister(customerId, dto.token);
  }
}
