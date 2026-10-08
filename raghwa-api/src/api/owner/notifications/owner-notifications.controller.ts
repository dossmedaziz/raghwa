import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { PageMetaDto, PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { NotificationDto, NotificationPageDto } from './owner-notifications.dto';

@ApiTags('Owner · Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`' })
@UseGuards(OwnerAuthGuard, GarageOwnershipGuard)
@Controller('v1/owner/garages/:garageId/notifications')
export class OwnerNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Garage notifications, newest first' })
  @ApiOkResponse({ type: NotificationPageDto })
  async list(@Param('garageId') garageId: string, @Query() q: PaginationQueryDto): Promise<NotificationPageDto> {
    const { items, total, unread } = await this.notifications.list(garageId, q.skip, q.limit);
    return { items: items.map(NotificationDto.from), unread, meta: PageMetaDto.of(q, total) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiNoContentResponse()
  async readAll(@Param('garageId') garageId: string): Promise<void> {
    await this.notifications.markAllRead(garageId);
  }
}
