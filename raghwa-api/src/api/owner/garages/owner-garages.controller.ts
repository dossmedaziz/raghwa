import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { CatalogService } from '../../../core/catalog/catalog.service';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { missingForPublish } from '../../../core/garages/garage-rules';
import { GaragesService, type GarageWithHours } from '../../../core/garages/garages.service';
import { ReservationsService } from '../../../core/reservations/reservations.service';
import { WeekHoursDto } from '../../shared/schedule.dto';
import { GarageProfileDto, OwnerGarageDto, OwnerGarageSummaryDto } from './owner-garages.dto';

@ApiTags('Owner · Garages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid owner access token' })
@UseGuards(OwnerAuthGuard)
@Controller('v1/owner/garages')
export class OwnerGaragesController {
  constructor(
    private readonly garages: GaragesService,
    private readonly catalog: CatalogService,
    private readonly reservations: ReservationsService,
  ) {}

  private async toDto(g: GarageWithHours): Promise<OwnerGarageDto> {
    return OwnerGarageDto.from(g, missingForPublish(g, g.hours, await this.catalog.countActive(g.id)));
  }

  @Get()
  @ApiOperation({ summary: 'My garages (the picker after login)', description: 'Includes today’s and upcoming booking counts.' })
  @ApiOkResponse({ type: [OwnerGarageSummaryDto] })
  async list(@AuthSubject() ownerId: string): Promise<OwnerGarageSummaryDto[]> {
    const garages = await this.garages.listForOwner(ownerId);
    const counts = await this.reservations.countsForGarages(garages.map((g) => g.id));
    return garages.map((g) => OwnerGarageSummaryDto.from(g, counts.get(g.id)));
  }

  @Post()
  @ApiOperation({ summary: 'Add a garage', description: 'Created as a draft with default opening hours (Mon-Sat 08:00-19:00).' })
  @ApiCreatedResponse({ type: OwnerGarageDto })
  async create(@AuthSubject() ownerId: string, @Body() dto: GarageProfileDto): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.create(ownerId, dto));
  }

  @Get(':garageId')
  @UseGuards(GarageOwnershipGuard)
  @ApiOperation({ summary: 'Garage profile, hours and publish checklist' })
  @ApiOkResponse({ type: OwnerGarageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND` (also for other owners’ garages)' })
  async get(@Param('garageId') garageId: string): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.getWithHours(garageId));
  }

  @Patch(':garageId')
  @UseGuards(GarageOwnershipGuard)
  @ApiOperation({ summary: 'Update the garage profile and slot settings' })
  @ApiOkResponse({ type: OwnerGarageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`INVALID_LOCATION`, `GARAGE_INCOMPLETE` (published garages)' })
  async update(@Param('garageId') garageId: string, @Body() dto: GarageProfileDto): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.update(garageId, dto));
  }

  @Put(':garageId/hours')
  @UseGuards(GarageOwnershipGuard)
  @ApiOperation({ summary: 'Replace the weekly opening hours' })
  @ApiOkResponse({ type: OwnerGarageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`INVALID_HOURS` (details.problems lists the days)' })
  async setHours(@Param('garageId') garageId: string, @Body() dto: WeekHoursDto): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.setHours(garageId, dto.days));
  }

  @Post(':garageId/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GarageOwnershipGuard)
  @ApiOperation({ summary: 'Make the garage visible to customers' })
  @ApiOkResponse({ type: OwnerGarageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`GARAGE_INCOMPLETE` (details.missing)' })
  async publish(@Param('garageId') garageId: string): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.publish(garageId));
  }

  @Post(':garageId/unpublish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GarageOwnershipGuard)
  @ApiOperation({ summary: 'Hide the garage from customers', description: 'Existing bookings are kept.' })
  @ApiOkResponse({ type: OwnerGarageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async unpublish(@Param('garageId') garageId: string): Promise<OwnerGarageDto> {
    return this.toDto(await this.garages.unpublish(garageId));
  }
}
