import { DOWF, MON, dayAt, type Lang } from '@/data/mock'

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

export const price = (p: number, L: Lang) => (L === 'ar' ? p + ' د.ت' : p + ' TND')
/** French/Tunisian decimal comma. */
export const num = (n: number | string) => String(n).replace('.', ',')
/** Keeps Latin runs (times, phone numbers) readable inside Arabic sentences. */
export const iso = (s: string, L: Lang) => (L === 'ar' ? '⁦' + s + '⁩' : s)

/** "samedi 3 octobre" / "السبت 3 أكتوبر" (capitalised in French). */
export function dLong(di: number, L: Lang) {
  const d = dayAt(di)
  const s = DOWF[L][d.getDay()] + ' ' + d.getDate() + ' ' + MON[L][d.getMonth()]
  return L === 'ar' ? s : s[0].toUpperCase() + s.slice(1)
}
/** 30-minute slot range, e.g. "11:00 – 11:30". */
export const range = (m: number, L: Lang) => iso(hm(m) + ' – ' + hm(m + 30), L)
