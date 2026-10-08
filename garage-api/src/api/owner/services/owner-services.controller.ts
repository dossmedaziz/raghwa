import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { unprocessable } from '../../../common/errors/domain.exception';
import { toMillimes } from '../../../common/money';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { CatalogService, type ServiceData } from '../../../core/catalog/catalog.service';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { GaragesService } from '../../../core/garages/garages.service';
import { CreateServiceDto, OwnerServiceDto, UpdateServiceDto } from './owner-services.dto';

@ApiTags('Owner · Services & prices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`, `SERVICE_NOT_FOUND`' })
@UseGuards(OwnerAuthGuard, GarageOwnershipGuard)
@Controller('v1/owner/garages/:garageId/services')
export class OwnerServicesController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly garages: GaragesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'All services of the garage (active and inactive)' })
  @ApiOkResponse({ type: [OwnerServiceDto] })
  async list(@Param('garageId') garageId: string): Promise<OwnerServiceDto[]> {
    return (await this.catalog.list(garageId)).map(OwnerServiceDto.from);
  }

  @Post()
  @ApiOperation({ summary: 'Add a service' })
  @ApiCreatedResponse({ type: OwnerServiceDto })
  async create(@Param('garageId') garageId: string, @Body() dto: CreateServiceDto): Promise<OwnerServiceDto> {
    const { price, ...rest } = dto;
    const data: ServiceData = { descriptionAr: '', descriptionFr: '', isActive: true, ...rest, priceMillimes: toMillimes(price) };
    return OwnerServiceDto.from(await this.catalog.create(garageId, data));
  }

  @Patch(':serviceId')
  @ApiOperation({ summary: 'Edit a service, or switch it on/off with `isActive`' })
  @ApiOkResponse({ type: OwnerServiceDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`LAST_ACTIVE_SERVICE`' })
  async update(
    @Param('garageId') garageId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<OwnerServiceDto> {
    const { price, ...rest } = dto;
    if (rest.isActive === false) await this.assertNotLastActive(garageId, serviceId);
    const data: Partial<ServiceData> = { ...rest, ...(price !== undefined ? { priceMillimes: toMillimes(price) } : {}) };
    return OwnerServiceDto.from(await this.catalog.update(garageId, serviceId, data));
  }

  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service', description: 'Past reservations keep the service name and price.' })
  @ApiNoContentResponse()
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`LAST_ACTIVE_SERVICE`' })
  async remove(@Param('garageId') garageId: string, @Param('serviceId', ParseUUIDPipe) serviceId: string): Promise<void> {
    await this.assertNotLastActive(garageId, serviceId);
    await this.catalog.remove(garageId, serviceId);
  }

  /** A published garage must keep at least one bookable service. */
  private async assertNotLastActive(garageId: string, serviceId: string) {
    const service = await this.catalog.get(garageId, serviceId);
    if (!service.isActive) return;
    const garage = await this.garages.getWithHours(garageId);
    if (garage.status === 'published' && (await this.catalog.countActive(garageId)) <= 1) {
      throw unprocessable('LAST_ACTIVE_SERVICE', 'A published garage must keep at least one active service');
    }
  }
}
