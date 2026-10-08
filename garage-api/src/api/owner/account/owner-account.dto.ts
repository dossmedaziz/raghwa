import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../../../common/validation/decorators';
import type { Owner } from '../../../core/owners/owner.entity';

export class OwnerNotificationPrefsDto {
  @ApiProperty({ description: 'SMS for every new booking.' }) newBooking: boolean;
  @ApiProperty({ description: 'SMS when a customer cancels.' }) cancellation: boolean;
  @ApiProperty({ description: 'SMS when a customer reschedules.' }) reschedule: boolean;
  @ApiProperty({ description: 'Daily summary every morning (not sent yet).' }) dailySummary: boolean;
}

export class OwnerDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Karim Mansouri' }) name: string;
  @ApiProperty({ example: '98123456' }) phone: string;
  @ApiProperty({ type: OwnerNotificationPrefsDto }) notifications: OwnerNotificationPrefsDto;
  @ApiProperty() createdAt: Date;

  static from(o: Owner): OwnerDto {
    return {
      id: o.id,
      name: o.name,
      phone: o.phone,
      notifications: {
        newBooking: o.notifyNewBooking,
        cancellation: o.notifyCancellation,
        reschedule: o.notifyReschedule,
        dailySummary: o.notifyDailySummary,
      },
      createdAt: o.createdAt,
    };
  }
}

export class UpdateOwnerDto {
  @ApiPropertyOptional({ example: 'Karim Mansouri', minLength: 3, maxLength: 100 })
  @IsOptional() @Trim() @IsString() @Length(3, 100)
  name?: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MaxLength(72)
  currentPassword: string;

  @ApiProperty({ minLength: 8, maxLength: 72 }) @IsString() @Length(8, 72)
  newPassword: string;
}

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() newBooking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cancellation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reschedule?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dailySummary?: boolean;
}
