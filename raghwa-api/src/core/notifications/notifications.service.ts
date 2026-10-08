import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { Notification, type NotificationData, type NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly clock: ClockService,
  ) {}

  async create(garageId: string, type: NotificationType, reservationId: string | null, data: NotificationData): Promise<void> {
    await this.notifications.insert({ garageId, type, reservationId, data, readAt: null });
  }

  async list(garageId: string, skip: number, take: number) {
    const [items, total] = await this.notifications.findAndCount({
      where: { garageId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip,
      take,
    });
    const unread = await this.notifications.countBy({ garageId, readAt: IsNull() });
    return { items, total, unread };
  }

  async markAllRead(garageId: string): Promise<void> {
    await this.notifications.update({ garageId, readAt: IsNull() }, { readAt: this.clock.now() });
  }
}
