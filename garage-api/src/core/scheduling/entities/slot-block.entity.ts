import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { Garage } from '../../garages/entities/garage.entity';
import type { BlockReason } from './day-block.entity';

/** A single slot closed for bookings. */
@Entity('slot_blocks')
@Unique(['garageId', 'date', 'time'])
export class SlotBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  time: string;

  @Column({ type: 'varchar', length: 20 })
  reason: BlockReason;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
