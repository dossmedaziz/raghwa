import type { DataSource } from 'typeorm';
import { hashPassword } from '../../common/crypto/password';
import { Owner } from '../../core/owners/owner.entity';

/** Development login for garage-web. */
export const DEFAULT_OWNER = { name: 'Mohamed Aziz Doss', phone: '52226876', password: 'testtest' };

/**
 * Creates the default owner with a confirmed phone number, ready to log in.
 * Idempotent: an existing account is left as it is (a password changed in the app is kept).
 */
export async function seedDefaultOwner(db: DataSource): Promise<{ owner: Owner; created: boolean }> {
  const owners = db.getRepository(Owner);
  const existing = await owners.findOneBy({ phone: DEFAULT_OWNER.phone });
  if (existing) {
    if (!existing.phoneVerifiedAt) {
      existing.phoneVerifiedAt = new Date();
      await owners.save(existing);
    }
    return { owner: existing, created: false };
  }
  const owner = await owners.save(
    owners.create({
      name: DEFAULT_OWNER.name,
      phone: DEFAULT_OWNER.phone,
      passwordHash: await hashPassword(DEFAULT_OWNER.password),
      phoneVerifiedAt: new Date(),
    }),
  );
  return { owner, created: true };
}
