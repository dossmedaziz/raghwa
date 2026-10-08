import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DateField, PhoneField, TimeField } from './decorators';

class Sample {
  @PhoneField() phone: string;
  @DateField() date: string;
  @TimeField() time: string;
  @PhoneField({ optional: true }) other?: string;
}

const check = (plain: object) => {
  const obj = plainToInstance(Sample, plain);
  return { obj, props: validateSync(obj).map((e) => e.property) };
};

describe('validation decorators', () => {
  const valid = { phone: '98 123 456', date: '2026-10-21', time: '09:30' };

  it('accepts valid values and normalises the phone number', () => {
    const { obj, props } = check(valid);
    expect(props).toEqual([]);
    expect(obj.phone).toBe('98123456');
  });

  it.each([
    ['phone', '12345678'],
    ['phone', '9812345'],
    ['date', '2026-02-30'],
    ['date', '21/10/2026'],
    ['time', '24:00'],
    ['time', '9:30'],
    ['other', 'abc'],
  ])('rejects %s = %s', (field, value) => {
    expect(check({ ...valid, [field]: value }).props).toEqual([field]);
  });
});
