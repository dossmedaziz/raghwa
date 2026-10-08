import type { Filters } from '@/store'
import type { Lang } from '@/data/constants'
import { apiWeekday, nowTime, today } from '@/lib/clock'
import { iso, num, price, toM } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { DayHours, GarageCard } from '@/lib/types'

/** Display fields for a garage card in the current language. */
export function useGarageView() {
  const { tr, L } = useT()
  return (g: GarageCard) => ({
    id: g.id,
    name: g.name,
    area: [g.area, g.city].filter(Boolean).join(', '),
    addr: g.address,
    dist: g.distanceKm === null ? null : tr('km', { d: num(g.distanceKm) }),
    from: g.fromPrice === null ? null : tr('from', { p: price(g.fromPrice, L) }),
  })
}

/** Name / description of a service in the current language. */
export const svcName = (s: { nameAr: string; nameFr: string }, L: Lang) => (L === 'ar' ? s.nameAr : s.nameFr) || s.nameAr || s.nameFr
export const svcDesc = (s: { descriptionAr: string; descriptionFr: string }, L: Lang) => (L === 'ar' ? s.descriptionAr : s.descriptionFr)

/** Opening hours of one weekday as text ("08:00 – 13:00, 14:00 – 19:00"), or null when closed. */
export const dayHoursText = (h: DayHours | undefined, L: Lang) =>
  !h?.isOpen ? null : iso(h.hasBreak ? `${h.opensAt} – ${h.breakStart}, ${h.breakEnd} – ${h.closesAt}` : `${h.opensAt} – ${h.closesAt}`, L)

/** Is the garage open right now (Tunis time), and when does that change today? */
export function openState(hours: DayHours[], date = today(), now = nowTime()): { open: boolean; closes?: string; opens?: string } {
  const h = hours.find((x) => x.dayOfWeek === apiWeekday(date))
  if (!h?.isOpen) return { open: false }
  const n = toM(now)
  if (n < toM(h.opensAt)) return { open: false, opens: h.opensAt }
  if (n >= toM(h.closesAt)) return { open: false }
  if (h.hasBreak && n >= toM(h.breakStart) && n < toM(h.breakEnd)) return { open: false, opens: h.breakEnd }
  return { open: true, closes: h.hasBreak && n < toM(h.breakStart) ? h.breakStart : h.closesAt }
}

/** Does a garage pass the map filters? (Distance is only known when the phone's position is.) */
export const passes = (g: GarageCard, F: Filters) =>
  (!F.dist || g.distanceKm === null || g.distanceKm <= F.dist) && (!F.price || (g.fromPrice !== null && g.fromPrice <= F.price))

export const filterCount = (F: Filters) => Number(!!F.dist) + Number(!!F.price)
