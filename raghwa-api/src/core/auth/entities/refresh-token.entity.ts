import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { Audience } from '../auth.types';

/** Long-lived session token. Rotated on every refresh; only its hash is stored. */
@Entity('refresh_tokens')
@Index(['audience', 'subjectId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  audience: Audience;

  /** Owner id or customer id, depending on `audience`. */
  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
