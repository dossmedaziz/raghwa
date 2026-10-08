import { randomInt } from 'node:crypto';

/** No 0/O, 1/I/L: easy to read out over the phone. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Booking reference such as "RGW-7K3M9Q" (31^6 ≈ 887 million combinations; uniqueness is enforced by the DB). */
export function newReservationRef(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `RGW-${out}`;
}
