import { SnakeNamingStrategy } from './naming.strategy';

describe('SnakeNamingStrategy', () => {
  const s = new SnakeNamingStrategy();

  it('snake_cases columns and classes', () => {
    expect(s.columnName('slotDurationMinutes', '', [])).toBe('slot_duration_minutes');
    expect(s.columnName('ignored', 'customName', [])).toBe('custom_name');
    expect(s.tableName('ReservationLine', undefined)).toBe('reservation_line');
    expect(s.tableName('X', 'services')).toBe('services');
    expect(s.joinColumnName('garage', 'id')).toBe('garage_id');
  });

  it('builds readable constraint names', () => {
    expect(s.primaryKeyName('public.owners')).toBe('pk_owners');
    expect(s.uniqueConstraintName('owners', ['phone'])).toBe('uq_owners_phone');
    expect(s.foreignKeyName('reservations', ['garage_id'])).toBe('fk_reservations_garage_id');
    expect(s.indexName('reservations', ['garage_id', 'date'])).toBe('idx_reservations_garage_id_date');
  });
});
