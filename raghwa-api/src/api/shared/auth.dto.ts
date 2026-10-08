import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PhoneField } from '../../common/validation/decorators';
import { OTP_LENGTH } from '../../core/auth/otp.service';
import type { TokenPair } from '../../core/auth/tokens.service';

export class PhoneDto {
  @PhoneField() phone: string;
}

export class VerifyCodeDto {
  @PhoneField() phone: string;

  @ApiProperty({ example: '0427', description: `${OTP_LENGTH}-digit code received by SMS.` })
  @IsString()
  @Matches(new RegExp(`^\\d{${OTP_LENGTH}}$`), { message: `code must be ${OTP_LENGTH} digits` })
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token received at login.' })
  @IsString() @IsNotEmpty()
  refreshToken: string;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Send as `Authorization: Bearer <accessToken>`.' }) accessToken: string;
  @ApiProperty({ description: 'Single use: exchange it at /auth/refresh for a new pair before the access token expires.' })
  refreshToken: string;
  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds.' }) expiresIn: number;

  static from(t: TokenPair): TokenPairDto {
    return { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn };
  }
}

export class OtpSentDto {
  @ApiProperty({ example: '98123456' }) phone: string;
  @ApiProperty({ example: 60, description: 'Seconds before another code can be requested.' }) resendAfterSeconds: number;
}
