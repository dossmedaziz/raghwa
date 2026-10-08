import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Garage } from '../garages/entities/garage.entity';

/** A service a garage sells (e.g. "Lavage complet"). Named WashService to avoid clashing with Nest "services". */
@Entity('services')
@Index(['garageId'])
export class WashService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  garageId: string;

  @ManyToOne(() => Garage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'garage_id' })
  garage?: Relation<Garage>;

  @Column({ type: 'varchar', length: 80 })
  nameAr: string;

  @Column({ type: 'varchar', length: 80 })
  nameFr: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  descriptionAr: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  descriptionFr: string;

  @Column({ type: 'int' })
  priceMillimes: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
