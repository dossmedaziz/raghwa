import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { PageMetaDto } from '../../../common/dto/pagination.dto';
import { unprocessable } from '../../../common/errors/domain.exception';
import { ClockService } from '../../../common/clock/clock.service';
import { daysBetween } from '../../../common/time/time.utils';
import { CatalogService } from '../../../core/catalog/catalog.service';
import { GaragesService } from '../../../core/garages/garages.service';
import { BOOKING_WINDOW_DAYS, SchedulingService } from '../../../core/scheduling/scheduling.service';
import {
  AvailabilityDto, AvailabilityQueryDto, GarageCardDto, GarageCardPageDto, GarageDetailDto, GarageSearchQueryDto,
} from './customer-garages.dto';

/** Public: browsing garages does not require login. */
@ApiTags('Garages')
@Controller('v1/garages')
export class CustomerGaragesController {
  constructor(
    private readonly garages: GaragesService,
    private readonly catalog: CatalogService,
    private readonly scheduling: SchedulingService,
    private readonly clock: ClockService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Find garages', description: 'Search by text and city; pass lat/lng to get the nearest first.' })
  @ApiOkResponse({ type: GarageCardPageDto })
  async search(@Query() q: GarageSearchQueryDto): Promise<GarageCardPageDto> {
    const near = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng, radiusKm: q.radiusKm } : undefined;
    const { items, total } = await this.garages.searchPublished({ q: q.q, city: q.city, near, skip: q.skip, take: q.limit });
    const prices = await this.catalog.minActivePrices(items.map((i) => i.garage.id));
    return {
      items: items.map((i) => GarageCardDto.from(i.garage, i.distanceMeters, prices.get(i.garage.id))),
      meta: PageMetaDto.of(q, total),
    };
  }

  @Get(':garageId')
  @ApiOperation({ summary: 'Garage page: details, hours and services' })
  @ApiOkResponse({ type: GarageDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND` (also for unpublished garages)' })
  async get(@Param('garageId', ParseUUIDPipe) garageId: string): Promise<GarageDetailDto> {
    const garage = await this.garages.getPublished(garageId);
    return GarageDetailDto.from(garage, await this.catalog.list(garageId, { activeOnly: true }));
  }

  @Get(':garageId/availability')
  @ApiOperation({ summary: 'Bookable slots for one day' })
  @ApiOkResponse({ type: AvailabilityDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`DATE_OUT_OF_RANGE`' })
  async availability(@Param('garageId', ParseUUIDPipe) garageId: string, @Query() q: AvailabilityQueryDto): Promise<AvailabilityDto> {
    await this.garages.getPublished(garageId);
    const ahead = daysBetween(this.clock.today(), q.date);
    if (ahead < 0 || ahead > BOOKING_WINDOW_DAYS) {
      throw unprocessable('DATE_OUT_OF_RANGE', `Pick a date between today and ${BOOKING_WINDOW_DAYS} days ahead`);
    }
    const [day] = await this.scheduling.getSchedule(garageId, q.date, q.date);
    return AvailabilityDto.from(day);
  }
}
