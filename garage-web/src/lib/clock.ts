// "Now" in the garages' time zone. The API uses the same zone (APP_TIMEZONE=Africa/Tunis),
// so dates and slot times line up whatever the browser's own time zone is.

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Tunis',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(d: Date) {
  const p: Record<string, string> = {}
  for (const { type, value } of fmt.formatToParts(d)) p[type] = value
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

/** Today's date in Tunis, "YYYY-MM-DD". */
export const today = () => parts(new Date()).date

/** Current time in Tunis, "HH:MM". */
export const nowTime = () => parts(new Date()).time

/** An ISO timestamp from the API as Tunis date + time. */
export const localDateTime = (iso: string) => parts(new Date(iso))
