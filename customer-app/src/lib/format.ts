import { DOWF, MON, type Lang } from '@/data/constants'
import { dateParts } from '@/lib/clock'

/** minutes since midnight → "HH:MM" */
export const hm = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
/** "HH:MM" → minutes since midnight */
export const toM = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
export const digits = (v: string) => (v || '').replace(/\D/g, '')
/** Formats up to 8 digits as "XX XXX XXX". */
export const fmtPhone = (v: string) => {
  const d = digits(v).slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(' ')
}

/** French/Tunisian decimal comma. */
export const num = (n: number | string) => String(n).replace('.', ',')
/** TND amount (the API may send millime precision, e.g. 12.5). */
export const price = (p: number, L: Lang) => {
  const n = num(Math.round(p * 1000) / 1000)
  return L === 'ar' ? n + ' د.ت' : n + ' TND'
}
/** Keeps Latin runs (times, phone numbers) readable inside Arabic sentences. */
export const iso = (s: string, L: Lang) => (L === 'ar' ? '⁦' + s + '⁩' : s)

/** "samedi 3 octobre" / "السبت 3 أكتوبر" (capitalised in French). */
export function dLong(date: string, L: Lang) {
  const d = dateParts(date)
  const s = DOWF[L][d.dow] + ' ' + d.day + ' ' + MON[L][d.month]
  return L === 'ar' ? s : s[0].toUpperCase() + s.slice(1)
}
/** Slot range, e.g. "11:00 – 11:30". */
export const range = (time: string, minutes: number, L: Lang) => iso(time + ' – ' + hm(toM(time) + minutes), L)

/** Initials for the avatar ("Ahmed Ben Salah" → "AB"). */
export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
