import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { OwnersModule } from '../owners/owners.module';
import { CustomerAuthService } from './customer-auth.service';
import { OtpCode } from './entities/otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { CustomerAuthGuard, OwnerAuthGuard } from './guards/access-token.guard';
import { OtpService } from './otp.service';
import { OwnerAuthService } from './owner-auth.service';
import { TokensService } from './tokens.service';

@Module({
  // Secrets are passed per call (one per audience), so the JwtModule itself has no default secret.
  imports: [TypeOrmModule.forFeature([OtpCode, RefreshToken]), JwtModule.register({}), OwnersModule, CustomersModule],
  providers: [OtpService, TokensService, OwnerAuthService, CustomerAuthService, OwnerAuthGuard, CustomerAuthGuard],
  exports: [TokensService, OwnerAuthService, CustomerAuthService, OwnerAuthGuard, CustomerAuthGuard],
})
export class AuthModule {}
