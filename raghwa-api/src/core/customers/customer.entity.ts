import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** A mobile-app customer. Registers with name, phone and password. */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  /** Null only for accounts created by the former SMS-code login: they set one by registering again. */
  @Column({ type: 'text', nullable: true, select: false })
  passwordHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
