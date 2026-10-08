// "Now" in the garages' time zone. The API works in Africa/Tunis (APP_TIMEZONE), and Tunisia stays on UTC+1 all
// year (no DST since 2009), so a fixed offset is exact whatever the phone's own zone, without relying on Intl
// time-zone data in Hermes. Dates are "YYYY-MM-DD" strings handled with UTC maths.

const OFFSET_MS = 60 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')
const parse = (date: string) => new Date(date + 'T00:00:00Z')
const iso = (d: Date) => d.toISOString().slice(0, 10)
/** The current instant shifted to Tunis wall-clock time (read it with the getUTC* methods). */
const tunis = () => new Date(Date.now() + OFFSET_MS)

/** Today's date in Tunis. */
export const today = () => iso(tunis())

/** Current time in Tunis, "HH:MM". */
export const nowTime = () => {
  const d = tunis()
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes())
}

export const addDays = (date: string, n: number) => {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** Day, month (0-based), year and weekday (0 = Sunday) of a date. */
export const dateParts = (date: string) => {
  const d = parse(date)
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), dow: d.getUTCDay() }
}

/** The API numbers weekdays from Monday (0) to Sunday (6). */
export const apiWeekday = (date: string) => (dateParts(date).dow + 6) % 7

/** Minutes from now until a Tunis date + time (negative once it has started). */
export const minutesUntil = (date: string, time: string) => Math.round((Date.parse(date + 'T' + time + ':00Z') - OFFSET_MS - Date.now()) / 60000)
