import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { PageMetaDto } from '../../../common/dto/pagination.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { CustomerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { ReservationsService } from '../../../core/reservations/reservations.service';
import {
  BookReservationDto, CustomerReservationDto, CustomerReservationPageDto, CustomerReservationQueryDto, RescheduleDto,
} from './customer-reservations.dto';

const SLOT_ERRORS =
  '`SLOT_IN_PAST`, `BOOKING_TOO_FAR`, `GARAGE_CLOSED`, `DAY_BLOCKED`, `NOT_A_SLOT`, `SLOT_BLOCKED`, `INVALID_SERVICES`';

@ApiTags('Reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid customer access token' })
@UseGuards(CustomerAuthGuard)
@Controller('v1/reservations')
export class CustomerReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a slot', description: 'Confirmed immediately; payment is cash at the garage.' })
  @ApiCreatedResponse({ type: CustomerReservationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`SLOT_FULL`, `DUPLICATE_BOOKING`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: SLOT_ERRORS })
  async book(@AuthSubject() customerId: string, @Body() dto: BookReservationDto): Promise<CustomerReservationDto> {
    return CustomerReservationDto.from(await this.reservations.book(customerId, dto));
  }

  @Get()
  @ApiOperation({ summary: 'My reservations', description: '`upcoming`: soonest first. `past`: done, cancelled or passed, latest first.' })
  @ApiOkResponse({ type: CustomerReservationPageDto })
  async list(@AuthSubject() customerId: string, @Query() q: CustomerReservationQueryDto): Promise<CustomerReservationPageDto> {
    const { items, total } = await this.reservations.listForCustomer(customerId, q.scope, q.skip, q.limit);
    return { items: items.map(CustomerReservationDto.from), meta: PageMetaDto.of(q, total) };
  }

  @Get(':reservationId')
  @ApiOperation({ summary: 'Reservation details' })
  @ApiOkResponse({ type: CustomerReservationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_FOUND`' })
  async get(@AuthSubject() customerId: string, @Param('reservationId', ParseUUIDPipe) id: string): Promise<CustomerReservationDto> {
    return CustomerReservationDto.from(await this.reservations.getForCustomer(customerId, id));
  }

  @Post(':reservationId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel my reservation', description: 'Possible until the slot starts.' })
  @ApiOkResponse({ type: CustomerReservationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_FOUND`' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_UPCOMING`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`RESERVATION_STARTED`' })
  async cancel(@AuthSubject() customerId: string, @Param('reservationId', ParseUUIDPipe) id: string): Promise<CustomerReservationDto> {
    return CustomerReservationDto.from(await this.reservations.cancelByCustomer(customerId, id));
  }

  @Post(':reservationId/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move my reservation to another slot', description: 'Same rules as booking; the old slot is freed.' })
  @ApiOkResponse({ type: CustomerReservationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_FOUND`' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`SLOT_FULL`, `RESERVATION_NOT_UPCOMING`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: `${SLOT_ERRORS}, \`SAME_SLOT\`, \`RESERVATION_STARTED\`` })
  async reschedule(
    @AuthSubject() customerId: string,
    @Param('reservationId', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleDto,
  ): Promise<CustomerReservationDto> {
    return CustomerReservationDto.from(await this.reservations.reschedule(customerId, id, dto.date, dto.time));
  }
}
