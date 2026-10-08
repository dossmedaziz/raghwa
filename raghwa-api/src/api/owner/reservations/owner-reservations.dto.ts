import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageMetaDto, PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { DateField, Trim } from '../../../common/validation/decorators';
import type { ReservationStatus } from '../../../core/reservations/entities/reservation.entity';
import type { FullReservation } from '../../../core/reservations/reservations.service';
import { RESERVATION_STATUSES, ReservationBaseDto, reservationBase } from '../../shared/reservation.dto';

export class OwnerReservationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RESERVATION_STATUSES })
  @IsOptional() @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Customer name, phone or reference.', example: 'Ahmed' })
  @IsOptional() @Trim() @IsString() @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Only reservations including this service.' })
  @IsOptional() @IsUUID()
  serviceId?: string;

  @DateField({ optional: true }) from?: string;
  @DateField({ optional: true }) to?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'By date and time.' })
  @IsOptional() @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class ReservationCustomerDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Ahmed Ben Salah' }) name: string | null;
  @ApiProperty({ example: '22345671' }) phone: string;
}

export class OwnerReservationDto extends ReservationBaseDto {
  @ApiProperty({ type: ReservationCustomerDto }) customer: ReservationCustomerDto;

  static from(r: FullReservation): OwnerReservationDto {
    return { ...reservationBase(r), customer: { id: r.customer.id, name: r.customer.name, phone: r.customer.phone } };
  }
}

export class OwnerReservationPageDto {
  @ApiProperty({ type: [OwnerReservationDto] }) items: OwnerReservationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
