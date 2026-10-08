import { hashPassword, verifyPassword } from './password';
import { randomDigits, randomToken, sha256 } from './tokens';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('raghwa2026');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toContain('raghwa2026');
    await expect(verifyPassword('raghwa2026', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
  });
});

describe('token helpers', () => {
  it('creates random url-safe tokens', () => {
    const a = randomToken(), b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes deterministically', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('pads numeric codes', () => {
    for (let i = 0; i < 50; i++) expect(randomDigits(4)).toMatch(/^\d{4}$/);
  });
});
