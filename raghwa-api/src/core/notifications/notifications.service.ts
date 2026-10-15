import { Injectable, type BeforeApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { filter, Subject, takeUntil, type Observable } from 'rxjs';
import { IsNull, Repository } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { Notification, type NotificationData, type NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService implements BeforeApplicationShutdown {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly clock: ClockService,
  ) {}

  /** Every notification just created, for the live stream (in-process: one API instance). */
  private readonly created = new Subject<Notification>();
  private readonly stopping = new Subject<void>();
  /** Emits when the API shuts down: live streams must end, or the HTTP server waits for them before exiting. */
  readonly shutdown$: Observable<void> = this.stopping.asObservable();

  async beforeApplicationShutdown() {
    const open = this.created.observed;
    this.stopping.next();
    this.stopping.complete();
    // Let the ended streams flush, so the HTTP server sees their sockets idle and closes them at once
    // (otherwise each lingers until the keep-alive timeout).
    if (open) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  async create(garageId: string, type: NotificationType, reservationId: string | null, data: NotificationData): Promise<void> {
    const n = await this.notifications.save(this.notifications.create({ garageId, type, reservationId, data, readAt: null }));
    this.created.next(n);
  }

  /** The garage's new notifications as they are created (garage-web listens to it to update without polling). */
  live(garageId: string): Observable<Notification> {
    return this.created.pipe(filter((n) => n.garageId === garageId), takeUntil(this.stopping));
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
