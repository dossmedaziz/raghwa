import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** A garage owner account. One owner can run several garages. */
@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  phone: string;

  @Column({ type: 'text' })
  passwordHash: string;

  /** Null until the sign-up OTP is confirmed; unverified owners cannot log in. */
  @Column({ type: 'timestamptz', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  notifyNewBooking: boolean;

  @Column({ type: 'boolean', default: true })
  notifyCancellation: boolean;

  @Column({ type: 'boolean', default: true })
  notifyReschedule: boolean;

  @Column({ type: 'boolean', default: false })
  notifyDailySummary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
