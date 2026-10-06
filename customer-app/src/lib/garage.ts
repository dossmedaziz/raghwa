import type { Color } from '@/theme'
import type { Garage } from '@/data/mock'
import type { Filters } from '@/store'
import { num, price } from '@/lib/format'
import { useT } from '@/lib/i18n'

/** Display fields for a garage in the current language. */
export function useGarageView() {
  const { t, tr, li, L } = useT()
  return (g: Garage) => ({
    id: g.id,
    name: g.n[li],
    area: g.ar[li],
    addr: g.a[li],
    rating: num(g.r.toFixed(1)),
    reviews: tr('reviews_n', { n: g.rc }),
    dist: tr('km', { d: num(g.d) }),
    from: tr('from', { p: price(g.from, L) }),
    status: g.open ? t.open : t.closed,
    sBg: (g.open ? 'positiveTint' : 'negativeTint') as Color,
    sFg: (g.open ? 'positiveInk' : 'negativeInk') as Color,
    hours: g.open ? tr('closes_at', { t: g.close }) : tr('opens_at', { t: g.opens ?? '' }),
    tel: g.tel ?? '+216 71 000 000',
  })
}

/** Does a garage pass the map filters? */
export const passes = (g: Garage, F: Filters) =>
  (!F.open || g.open) && (!F.dist || g.d <= F.dist) && (!F.rating || g.r >= F.rating) && (!F.price || g.from <= F.price) && F.svc.every((x) => g.svc.includes(x))

export const filterCount = (F: Filters) => Number(F.open) + Number(!!F.dist) + Number(!!F.rating) + Number(!!F.price) + F.svc.length
