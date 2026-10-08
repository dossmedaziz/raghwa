import { BadRequestException } from '@nestjs/common';
import { ParseDatePipe, ParseTimePipe } from './params.pipes';

describe('param pipes', () => {
  it('passes valid dates and times through', () => {
    expect(new ParseDatePipe().transform('2026-10-21')).toBe('2026-10-21');
    expect(new ParseTimePipe().transform('09:30')).toBe('09:30');
  });

  it('rejects invalid values with 400', () => {
    expect(() => new ParseDatePipe().transform('2026-02-31')).toThrow(BadRequestException);
    expect(() => new ParseTimePipe().transform('9h30')).toThrow(BadRequestException);
  });
});
