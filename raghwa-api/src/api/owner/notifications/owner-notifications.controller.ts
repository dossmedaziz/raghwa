import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Sse, UseGuards, type MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { interval, map, merge, of, takeUntil, timer, type Observable } from 'rxjs';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import type { Env } from '../../../config/env.validation';
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
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Garage notifications, newest first' })
  @ApiOkResponse({ type: NotificationPageDto })
  async list(@Param('garageId') garageId: string, @Query() q: PaginationQueryDto): Promise<NotificationPageDto> {
    const { items, total, unread } = await this.notifications.list(garageId, q.skip, q.limit);
    return { items: items.map(NotificationDto.from), unread, meta: PageMetaDto.of(q, total) };
  }

  @Sse('stream')
  @ApiOperation({
    summary: 'Live notifications (Server-Sent Events)',
    description:
      '`notification` events carry a `NotificationDto` as soon as it is created (new booking, cancellation, reschedule). ' +
      '`ready` is sent on connect and `ping` every 25 s. The stream ends when the access token expires (and when the API restarts): ' +
      'reconnect with a fresh token ' +
      '(and refetch the list, since events are not replayed).',
  })
  @ApiProduces('text/event-stream')
  stream(@Param('garageId') garageId: string): Observable<MessageEvent> {
    const ttlMs = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) * 1000;
    return merge(
      of({ type: 'ready', data: {} }),
      this.notifications.live(garageId).pipe(map((n) => ({ type: 'notification', data: NotificationDto.from(n) }))),
      // Keeps proxies and load balancers from closing an idle connection.
      interval(25_000).pipe(map(() => ({ type: 'ping', data: {} }))),
    ).pipe(takeUntil(merge(timer(ttlMs), this.notifications.shutdown$)));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiNoContentResponse()
  async readAll(@Param('garageId') garageId: string): Promise<void> {
    await this.notifications.markAllRead(garageId);
  }
}
