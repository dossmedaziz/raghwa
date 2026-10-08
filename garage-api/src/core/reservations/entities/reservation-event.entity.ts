import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import type { Actor } from './reservation.entity';
import { Reservation } from './reservation.entity';

export type ReservationEventType = 'booked' | 'rescheduled' | 'done' | 'cancelled';

/** History entry shown in the reservation timeline. */
@Entity('reservation_events')
@Index(['reservationId'])
export class ReservationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reservationId: string;

  @ManyToOne(() => Reservation, (r) => r.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Relation<Reservation>;

  @Column({ type: 'varchar', length: 15 })
  type: ReservationEventType;

  @Column({ type: 'varchar', length: 10, nullable: true })
  actor: Actor | null;

  /** For "rescheduled": the slot before the change. */
  @Column({ type: 'date', nullable: true })
  previousDate: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  previousTime: string | null;

  /** Set from ClockService so the timeline is deterministic in tests. */
  @Column({ type: 'timestamptz' })
  at: Date;
}
