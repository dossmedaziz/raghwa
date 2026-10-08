import { newReservationRef } from './reservation-ref';

describe('newReservationRef', () => {
  it('has the RGW-XXXXXX shape without ambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(newReservationRef()).toMatch(/^RGW-[2-9A-HJKMNP-Z]{6}$/);
  });

  it('is practically unique', () => {
    expect(new Set(Array.from({ length: 1000 }, newReservationRef)).size).toBe(1000);
  });
});
