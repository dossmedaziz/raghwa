import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCar } from './customer-car.entity';
import { CustomerCarsService } from './customer-cars.service';
import { Customer } from './customer.entity';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerCar])],
  providers: [CustomersService, CustomerCarsService],
  exports: [CustomersService, CustomerCarsService],
})
export class CustomersModule {}
