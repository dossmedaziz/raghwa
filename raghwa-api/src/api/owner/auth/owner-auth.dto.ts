import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, Length, MaxLength } from 'class-validator';
import { PhoneField, Trim } from '../../../common/validation/decorators';
import { TokenPairDto } from '../../shared/auth.dto';
import { OwnerDto } from '../account/owner-account.dto';

export class OwnerSignupDto {
  @ApiProperty({ example: 'Karim Mansouri', minLength: 3, maxLength: 100 })
  @Trim() @IsString() @Length(3, 100)
  name: string;

  @PhoneField() phone: string;

  @ApiProperty({ example: 'raghwa2026', minLength: 8, maxLength: 72 })
  @IsString() @Length(8, 72)
  password: string;
}

export class OwnerLoginDto {
  @PhoneField() phone: string;

  @ApiProperty({ example: 'raghwa2026' })
  @IsString() @MaxLength(72)
  password: string;
}

export class PasswordResetTokenDto {
  @ApiProperty({ description: 'Valid for 10 minutes. Send it to /password/reset with the new password.' })
  resetToken: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsJWT()
  resetToken: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString() @Length(8, 72)
  password: string;
}

export class OwnerSessionDto {
  @ApiProperty({ type: OwnerDto }) owner: OwnerDto;
  @ApiProperty({ type: TokenPairDto }) tokens: TokenPairDto;
}
