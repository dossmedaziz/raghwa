import { toMinutes, type DayHoursLike } from '../../common/time/time.utils';

/** New garages start with the same week as the garage-web prototype: Mon-Sat 08:00-19:00, lunch break on weekdays. */
export const DEFAULT_WEEK: DayHoursLike[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  isOpen: day < 6,
  opensAt: '08:00',
  closesAt: '19:00',
  hasBreak: day < 5,
  breakStart: '13:00',
  breakEnd: '14:00',
}));

export type MissingForPublish = 'name' | 'phone' | 'address' | 'area' | 'location' | 'hours' | 'services';

/** What still has to be filled in before customers can see the garage (mirrors the onboarding steps). */
export function missingForPublish(
  g: { name: string; phone: string; address: string; area: string; latitude: number | null; longitude: number | null },
  hours: Pick<DayHoursLike, 'isOpen'>[],
  activeServices: number,
): MissingForPublish[] {
  const missing: MissingForPublish[] = [];
  if (!g.name.trim()) missing.push('name');
  if (!g.phone) missing.push('phone');
  if (!g.address.trim()) missing.push('address');
  if (!g.area.trim()) missing.push('area');
  if (g.latitude === null || g.longitude === null) missing.push('location');
  if (!hours.some((h) => h.isOpen)) missing.push('hours');
  if (activeServices < 1) missing.push('services');
  return missing;
}

/** Returns a problem description for an invalid day, or null if it is consistent. */
export function hoursProblem(h: DayHoursLike): string | null {
  if (!h.isOpen) return null;
  const open = toMinutes(h.opensAt), close = toMinutes(h.closesAt);
  if (close <= open) return 'closing time must be after opening time';
  if (h.hasBreak) {
    const bs = toMinutes(h.breakStart), be = toMinutes(h.breakEnd);
    if (be <= bs) return 'break end must be after break start';
    if (bs < open || be > close) return 'break must be inside opening hours';
  }
  return null;
}
