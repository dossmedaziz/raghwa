import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Garage } from '../garages/entities/garage.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

export type NotificationType = 'reservation_created' | 'reservation_cancelled' | 'reservation_rescheduled';

export interface NotificationData {
  ref: string;
  customerName: string | null;
  date: string;
  time: string;
  previousDate?: string;
  previousTime?: string;
}

/** In-app notification for a garage's dashboard. The frontend renders the text from `type` + `data` in its language. */
@Entity('notifications')
@Index(['garageId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  reservationId: string | null;

  @ManyToOne(() => Reservation, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Relation<Reservation> | null;

  @Column({ type: 'jsonb' })
  data: NotificationData;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
