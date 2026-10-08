import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { Garage } from './garage.entity';

/** Opening hours for one day of the week (0 = Monday … 6 = Sunday). */
@Entity('garage_hours')
@Unique(['garageId', 'dayOfWeek'])
export class GarageHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, (g) => g.hours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'smallint' })
  dayOfWeek: number;

  @Column({ type: 'boolean' })
  isOpen: boolean;

  @Column({ type: 'varchar', length: 5 })
  opensAt: string;

  @Column({ type: 'varchar', length: 5 })
  closesAt: string;

  @Column({ type: 'boolean' })
  hasBreak: boolean;

  @Column({ type: 'varchar', length: 5 })
  breakStart: string;

  @Column({ type: 'varchar', length: 5 })
  breakEnd: string;
}
