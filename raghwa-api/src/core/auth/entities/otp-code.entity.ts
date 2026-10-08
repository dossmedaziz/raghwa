import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OtpPurpose = 'owner_signup' | 'owner_reset' | 'owner_phone' | 'customer_login';

/** A one-time SMS code. Only its SHA-256 hash is stored. */
@Entity('otp_codes')
@Index(['phone', 'purpose'])
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8 })
  phone: string;

  @Column({ type: 'varchar', length: 20 })
  purpose: OtpPurpose;

  @Column({ type: 'varchar', length: 64 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  /** Set from ClockService (not the DB clock) so resend cooldowns are testable. */
  @Column({ type: 'timestamptz' })
  createdAt: Date;
}
