import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { Garage } from '../../garages/entities/garage.entity';

export type BlockReason = 'holiday' | 'maintenance' | 'other';

/** A whole day closed for bookings. */
@Entity('day_blocks')
@Unique(['garageId', 'date'])
export class DayBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20 })
  reason: BlockReason;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
