import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { Garage } from '../../garages/entities/garage.entity';
import { ReservationEvent } from './reservation-event.entity';
import { ReservationLine } from './reservation-line.entity';

export type ReservationStatus = 'upcoming' | 'done' | 'cancelled';
export type Actor = 'customer' | 'garage';

@Entity('reservations')
@Index(['garageId', 'date', 'time'])
@Index(['customerId'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Short human reference shown to customers and owners, e.g. "RGW-7K3M9Q". */
  @Column({ type: 'varchar', length: 12, unique: true })
  ref: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Relation<Customer>;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  time: string;

  @Column({ type: 'varchar', length: 10, default: 'upcoming' })
  status: ReservationStatus;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cancelledBy: Actor | null;

  /** Sum of the line prices at booking time. Payment is cash at the garage. */
  @Column({ type: 'int' })
  totalMillimes: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  carBrand: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  carModel: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  carPlate: string | null;

  @OneToMany(() => ReservationLine, (l) => l.reservation, { cascade: ['insert'] })
  lines?: Relation<ReservationLine[]>;

  @OneToMany(() => ReservationEvent, (e) => e.reservation, { cascade: ['insert'] })
  events?: Relation<ReservationEvent[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
