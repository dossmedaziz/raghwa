import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Owner } from '../../owners/owner.entity';
import { GarageHours } from './garage-hours.entity';

export type GarageStatus = 'draft' | 'published';

/** A car-wash garage. Drafts are invisible to customers until published. */
@Entity('garages')
@Index(['ownerId'])
@Index(['status', 'city'])
// GiST index on the computed geography point, created by the migration (TypeORM cannot express it).
@Index('idx_garages_location', { synchronize: false })
export class Garage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: Relation<Owner>;

  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: GarageStatus;

  @Column({ type: 'varchar', length: 120, default: '' })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 8, default: '' })
  phone: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  address: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  area: string;

  @Column({ type: 'varchar', length: 60, default: 'Tunis' })
  city: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'int', default: 30 })
  slotDurationMinutes: number;

  /** Cars washed at the same time (parallel places per slot). */
  @Column({ type: 'int', default: 2 })
  capacity: number;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @OneToMany(() => GarageHours, (h) => h.garage)
  hours?: Relation<GarageHours[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
