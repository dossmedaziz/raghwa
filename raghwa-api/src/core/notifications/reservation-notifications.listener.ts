import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GaragesService } from '../garages/garages.service';
import {
  RESERVATION_CANCELLED, RESERVATION_CREATED, RESERVATION_DONE, RESERVATION_RESCHEDULED, type ReservationChangedEvent,
} from '../reservations/reservation.events';
import { PushService } from '../push/push.service';
import { SmsSender } from '../sms/sms-sender';
import type { NotificationData } from './notification.entity';
import { NotificationsService } from './notifications.service';

/** "2026-10-24" → "24/10". */
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Turns reservation changes into in-app notifications for the garage (streamed live to garage-web), plus SMS
 * to the owner (according to their preferences); and, for what the garage does, the customer is told on their
 * phones: a push when the wash is done, a push and an SMS when the garage cancels.
 * Errors are logged, never thrown: a failed SMS or push must not undo a booking.
 */
@Injectable()
export class ReservationNotificationsListener {
  private readonly logger = new Logger(ReservationNotificationsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly garages: GaragesService,
    private readonly sms: SmsSender,
    private readonly push: PushService,
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
        const day = shortDate(e.date);
        await this.push.notifyCustomer(
          e.customerId,
          (lang) =>
            lang === 'fr'
              ? { title: 'Réservation annulée', body: `${e.garageName} a annulé votre réservation du ${day} à ${e.time}.` }
              : { title: 'الحجز متاعك تبطّل', body: `${e.garageName} بطّل الحجز متاعك نهار ${day} على ${e.time}.` },
          { type: 'reservation_cancelled', reservationId: e.reservationId },
        );
        // Also by SMS: reaches customers who turned notifications off or are logged out.
        await this.sms.send(e.customerPhone, `Raghwa: الحجز ${e.ref} (${e.date} ${e.time}) تبطّل من الغاراج / Réservation annulée par le garage`);
        return;
      }
      await this.notifications.create(e.garageId, 'reservation_cancelled', e.reservationId, this.data(e));
      await this.smsOwner(e, 'notifyCancellation', `Raghwa Pro: ${e.ref} تبطّل / Réservation annulée (${e.date} ${e.time})`);
    });
  }

  @OnEvent(RESERVATION_DONE)
  async onDone(e: ReservationChangedEvent) {
    await this.safely(e, async () => {
      await this.push.notifyCustomer(
        e.customerId,
        (lang) =>
          lang === 'fr'
            ? { title: 'Votre voiture est prête 🚗', body: `${e.garageName} a terminé le lavage. Vous pouvez venir la récupérer.` }
            : { title: 'كرهبتك حاضرة 🚗', body: `${e.garageName} كمّل الغسلة. تنجم تجي تهزّها.` },
        { type: 'reservation_done', reservationId: e.reservationId },
      );
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
