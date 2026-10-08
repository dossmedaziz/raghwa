import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Customer } from './customer.entity';

/** A car saved by a customer. Bookings copy its brand, model and plate, so editing it later leaves them unchanged. */
@Entity('customer_cars')
@Index(['customerId'])
export class CustomerCar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Relation<Customer>;

  @Column({ type: 'varchar', length: 40 })
  brand: string;

  @Column({ type: 'varchar', length: 40 })
  model: string;

  /** As typed in the app, e.g. "215 TU 4521". */
  @Column({ type: 'varchar', length: 20 })
  plate: string;

  /** Pre-selected when booking. Exactly one per customer who has cars. */
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
