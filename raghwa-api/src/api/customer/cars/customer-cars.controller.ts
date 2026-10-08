import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { AuthSubject } from '../../../core/auth/decorators/auth-subject.decorator';
import { CustomerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { CustomerCarsService } from '../../../core/customers/customer-cars.service';
import { CarDto, CreateCarDto, UpdateCarDto } from './customer-cars.dto';

@ApiTags('Cars')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid customer access token' })
@UseGuards(CustomerAuthGuard)
@Controller('v1/me/cars')
export class CustomerCarsController {
  constructor(private readonly cars: CustomerCarsService) {}

  @Get()
  @ApiOperation({ summary: 'My cars', description: 'Default car first.' })
  @ApiOkResponse({ type: [CarDto] })
  async list(@AuthSubject() customerId: string): Promise<CarDto[]> {
    return (await this.cars.list(customerId)).map(CarDto.from);
  }

  @Post()
  @ApiOperation({ summary: 'Save a car' })
  @ApiCreatedResponse({ type: CarDto })
  async create(@AuthSubject() customerId: string, @Body() dto: CreateCarDto): Promise<CarDto> {
    return CarDto.from(await this.cars.create(customerId, dto));
  }

  @Patch(':carId')
  @ApiOperation({ summary: 'Edit a car, or make it the default with `isDefault: true`' })
  @ApiOkResponse({ type: CarDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`CAR_NOT_FOUND`' })
  async update(
    @AuthSubject() customerId: string,
    @Param('carId', ParseUUIDPipe) carId: string,
    @Body() dto: UpdateCarDto,
  ): Promise<CarDto> {
    return CarDto.from(await this.cars.update(customerId, carId, dto));
  }

  @Delete(':carId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a car', description: 'Past reservations keep the car they were booked with.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: '`CAR_NOT_FOUND`' })
  async remove(@AuthSubject() customerId: string, @Param('carId', ParseUUIDPipe) carId: string): Promise<void> {
    await this.cars.remove(customerId, carId);
  }
}
