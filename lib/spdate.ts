// Brazil has used a fixed UTC-3 offset with no daylight saving since 2019, so we can build
// unambiguous instants for a given São Paulo wall-clock time without a timezone library.
export const SP_OFFSET = '-03:00'

const DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function spDateString(date: Date) {
  return DATE_FMT.format(date) // 'YYYY-MM-DD'
}

const HOUR_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })

export function spHour(date: Date) {
  // 'en-US' with hour12:false can format midnight as "24" — normalize to 0.
  return Number(HOUR_FMT.format(date)) % 24
}

export function mondayOfWeek(dateStr: string, weekOffset = 0) {
  const weekday = weekdayOf(dateStr) // 0=Sun..6=Sat
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
  return addDaysToDateString(dateStr, -daysSinceMonday + weekOffset * 7)
}

export function addDaysToDateString(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function weekdayOf(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function instantAt(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00${SP_OFFSET}`)
}

export function startOfMonthInstant(dateStr: string) {
  return instantAt(`${dateStr.slice(0, 7)}-01`, '00:00')
}
