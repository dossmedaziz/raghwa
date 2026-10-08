import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GaragesService } from '../garages/garages.service';
import {
  RESERVATION_CANCELLED, RESERVATION_CREATED, RESERVATION_RESCHEDULED, type ReservationChangedEvent,
} from '../reservations/reservation.events';
import { SmsSender } from '../sms/sms-sender';
import type { NotificationData } from './notification.entity';
import { NotificationsService } from './notifications.service';

/**
 * Turns reservation changes into in-app notifications for the garage, plus SMS:
 * to the owner (according to their preferences) and to the customer when the garage cancels.
 * Errors are logged, never thrown: a failed SMS must not undo a booking.
 */
@Injectable()
export class ReservationNotificationsListener {
  private readonly logger = new Logger(ReservationNotificationsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly garages: GaragesService,
    private readonly sms: SmsSender,
  ) {}

  @OnEvent(RESERVATION_CREATED)
  async onCreated(e: ReservationChangedEvent) {
    await this.safely(e, async () => {
      await this.notifications.create(e.garageId, 'reservation_created', e.reservationId, this.data(e));
      await this.smsOwner(e, 'notifyNewBooking', `Raghwa Pro: حجز جديد ${e.ref} · ${e.date} ${e.time} / Nouvelle réservation`);
    });
  }

  @OnEvent(RESERVATION_RESCHEDULED)
  async onRescheduled(e: ReservationChangedEvent) {
    await this.safely(e, async () => {
      await this.notifications.create(e.garageId, 'reservation_rescheduled', e.reservationId, this.data(e));
      await this.smsOwner(e, 'notifyReschedule', `Raghwa Pro: ${e.ref} تبدّل لـ ${e.date} ${e.time} / Réservation reportée`);
    });
  }

  @OnEvent(RESERVATION_CANCELLED)
  async onCancelled(e: ReservationChangedEvent) {
    await this.safely(e, async () => {
      if (e.actor === 'garage') {
        await this.sms.send(e.customerPhone, `Raghwa: الحجز ${e.ref} (${e.date} ${e.time}) تبطّل من الغاراج / Réservation annulée par le garage`);
        return;
      }
      await this.notifications.create(e.garageId, 'reservation_cancelled', e.reservationId, this.data(e));
      await this.smsOwner(e, 'notifyCancellation', `Raghwa Pro: ${e.ref} تبطّل / Réservation annulée (${e.date} ${e.time})`);
    });
  }

  private data(e: ReservationChangedEvent): NotificationData {
    return {
      ref: e.ref,
      customerName: e.customerName,
      date: e.date,
      time: e.time,
      ...(e.previousDate ? { previousDate: e.previousDate, previousTime: e.previousTime } : {}),
    };
  }

  private async smsOwner(e: ReservationChangedEvent, pref: 'notifyNewBooking' | 'notifyReschedule' | 'notifyCancellation', text: string) {
    const garage = await this.garages.getWithOwner(e.garageId);
    if (garage?.owner?.[pref]) await this.sms.send(garage.owner.phone, text);
  }

  private async safely(e: ReservationChangedEvent, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Notification for reservation ${e.ref} failed`, err instanceof Error ? err.stack : String(err));
    }
  }
}
