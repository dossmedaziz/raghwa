import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm';
import { Customer } from '../customers/customer.entity';

export type PushLang = 'ar' | 'fr';
export const PUSH_LANGS: PushLang[] = ['ar', 'fr'];

/**
 * An Expo push token of a phone where a customer is logged in. A token belongs to one device, so it moves to
 * whoever logs in on that phone last. `lang` is the app language, so pushes are written in it.
 */
@Entity('push_tokens')
@Index(['customerId'])
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  token: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Relation<Customer>;

  @Column({ type: 'varchar', length: 2 })
  lang: PushLang;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
