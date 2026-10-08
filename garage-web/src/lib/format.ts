// Date, time, money and phone helpers ported from the prototype.
import { DAYS, DAYS_S, MONTHS, MONTHS_L, type Lang } from '@/data/i18n-strings'
import type { DayHours } from '@/lib/types'

/** "HH:MM" → minutes since midnight */
export const tm = (s: string) => {
  const [h, m] = String(s || '0:0').split(':')
  return +h * 60 + (+m || 0)
}
/** minutes since midnight → "HH:MM" */
export const mt = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')

const parse = (d: string) => {
  const [y, mo, da] = d.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, da))
}
export const addDays = (d: string, n: number) => {
  const x = parse(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
/** Day of week with Monday = 0 */
export const dow = (d: string) => (parse(d).getUTCDay() + 6) % 7

export type DateStyle = 'dm' | 'day' | 'dshort' | 'long' | 'default'
export function fmtDate(d: string, L: Lang, style: DateStyle = 'default') {
  const x = parse(d), day = x.getUTCDate(), mo = x.getUTCMonth(), w = dow(d)
  const dn = L === 'fr' ? DAYS.fr[w].toLowerCase() : DAYS.ar[w]
  if (style === 'dm') return day + ' ' + MONTHS[L][mo]
  if (style === 'day') return DAYS[L][w]
  if (style === 'dshort') return DAYS_S[L][w] + ' ' + day
  if (style === 'long') return DAYS[L][w] + ' ' + day + ' ' + MONTHS_L[L][mo] + ' ' + x.getUTCFullYear()
  return dn + ' ' + day + ' ' + MONTHS_L[L][mo]
}

export function money(n: number, L: Lang) {
  const s = Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')
  return L === 'ar' ? s + ' د.ت' : s + ' TND'
}
export const currency = (L: Lang) => (L === 'ar' ? 'د.ت' : 'TND')

/** Formats up to 8 local digits as "XX XXX XXX". */
export function phoneLocal(v: string) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8)
  let o = d.slice(0, 2)
  if (d.length > 2) o += ' ' + d.slice(2, 5)
  if (d.length > 5) o += ' ' + d.slice(5)
  return o
}
export const phone = (v: string) => '+216 ' + phoneLocal(v)
export const digits = (v: string) => v.replace(/\D/g, '')

/** Slot start times for one day, skipping slots that overlap the break. */
export function genSlots(h: DayHours | undefined, dur: number) {
  const out: string[] = []
  if (!h || !h.open || !dur) return out
  const a = tm(h.from), b = tm(h.to), bf = tm(h.bFrom), bt = tm(h.bTo)
  for (let m = a; m + dur <= b; m += dur) {
    if (h.brk && m < bt && m + dur > bf) continue
    out.push(mt(m))
  }
  return out
}

/** Deterministic 0..1 pseudo-random value used to fake future occupancy. */
export function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

/** Replaces {key} placeholders. */
export const fx = (str: string, o: Record<string, string | number>) => String(str).replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? ''))

/** Wraps text in Unicode LTR isolates so times stay readable inside Arabic sentences. */
export const iso = (x: string) => '⁦' + x + '⁩'
