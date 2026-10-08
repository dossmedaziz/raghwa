import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { WashService } from '../../catalog/wash-service.entity';
import { Reservation } from './reservation.entity';

/** One booked service. Name and price are copied so later catalog edits never change past bookings. */
@Entity('reservation_lines')
@Index(['reservationId'])
export class ReservationLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reservationId: string;

  @ManyToOne(() => Reservation, (r) => r.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Relation<Reservation>;

  @Column({ type: 'uuid', nullable: true })
  serviceId: string | null;

  @ManyToOne(() => WashService, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<WashService> | null;

  @Column({ type: 'varchar', length: 80 })
  nameAr: string;

  @Column({ type: 'varchar', length: 80 })
  nameFr: string;

  @Column({ type: 'int' })
  priceMillimes: number;
}
