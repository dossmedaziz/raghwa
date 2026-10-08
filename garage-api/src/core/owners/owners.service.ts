import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword, verifyPassword } from '../../common/crypto/password';
import { notFound, unprocessable } from '../../common/errors/domain.exception';
import { Owner } from './owner.entity';

export type NotificationPrefs = Pick<Owner, 'notifyNewBooking' | 'notifyCancellation' | 'notifyReschedule' | 'notifyDailySummary'>;

@Injectable()
export class OwnersService {
  constructor(@InjectRepository(Owner) private readonly owners: Repository<Owner>) {}

  findByPhone(phone: string): Promise<Owner | null> {
    return this.owners.findOneBy({ phone });
  }

  async get(id: string): Promise<Owner> {
    const owner = await this.owners.findOneBy({ id });
    if (!owner) throw notFound('OWNER_NOT_FOUND', 'Owner not found');
    return owner;
  }

  /** Creates an unverified owner, or refreshes the details of one that never confirmed its phone. */
  async upsertUnverified(name: string, phone: string, password: string): Promise<Owner> {
    const passwordHash = await hashPassword(password);
    const existing = await this.findByPhone(phone);
    if (existing) {
      existing.name = name;
      existing.passwordHash = passwordHash;
      return this.owners.save(existing);
    }
    return this.owners.save(this.owners.create({ name, phone, passwordHash, phoneVerifiedAt: null }));
  }

  async markVerified(owner: Owner, at: Date): Promise<Owner> {
    owner.phoneVerifiedAt = at;
    return this.owners.save(owner);
  }

  async updateProfile(id: string, data: { name?: string }): Promise<Owner> {
    const owner = await this.get(id);
    if (data.name !== undefined) owner.name = data.name;
    return this.owners.save(owner);
  }

  async setPassword(id: string, password: string): Promise<void> {
    await this.owners.update({ id }, { passwordHash: await hashPassword(password) });
  }

  async changePassword(id: string, current: string, next: string): Promise<void> {
    const owner = await this.get(id);
    if (!(await verifyPassword(current, owner.passwordHash))) {
      throw unprocessable('WRONG_PASSWORD', 'Current password is incorrect');
    }
    await this.setPassword(id, next);
  }

  async updateNotificationPrefs(id: string, prefs: Partial<NotificationPrefs>): Promise<Owner> {
    const owner = await this.get(id);
    Object.assign(owner, prefs);
    return this.owners.save(owner);
  }
}
