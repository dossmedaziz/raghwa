import { createHash, randomBytes, randomInt } from 'node:crypto';

/** Opaque, URL-safe random token (refresh tokens). */
export const randomToken = (bytes = 48) => randomBytes(bytes).toString('base64url');

/** SHA-256 hex digest. Used to store tokens and OTP codes without keeping the raw value. */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Numeric code with leading zeros, e.g. "0427". */
export const randomDigits = (length: number) => String(randomInt(0, 10 ** length)).padStart(length, '0');
