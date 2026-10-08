import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/pagination.dto';
import type { Notification, NotificationType } from '../../../core/notifications/notification.entity';

const TYPES: NotificationType[] = ['reservation_created', 'reservation_cancelled', 'reservation_rescheduled'];

export class NotificationDataDto {
  @ApiProperty({ example: 'RGW-7K3M9Q' }) ref: string;
  @ApiPropertyOptional({ nullable: true, type: String }) customerName: string | null;
  @ApiProperty({ example: '2026-10-24' }) date: string;
  @ApiProperty({ example: '10:30' }) time: string;
  @ApiPropertyOptional({ description: 'Rescheduled: the date before the change.' }) previousDate?: string;
  @ApiPropertyOptional() previousTime?: string;
}

export class NotificationDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TYPES, description: 'The app builds the sentence in the user’s language from `type` and `data`.' })
  type: NotificationType;
  @ApiPropertyOptional({ nullable: true, type: String }) reservationId: string | null;
  @ApiProperty({ type: NotificationDataDto }) data: NotificationDataDto;
  @ApiProperty() unread: boolean;
  @ApiProperty() createdAt: Date;

  static from(n: Notification): NotificationDto {
    return { id: n.id, type: n.type, reservationId: n.reservationId, data: n.data, unread: !n.readAt, createdAt: n.createdAt };
  }
}

export class NotificationPageDto {
  @ApiProperty({ type: [NotificationDto] }) items: NotificationDto[];
  @ApiProperty({ description: 'Unread notifications in total (for the bell badge).' }) unread: number;
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
