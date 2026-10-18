/** 'YYYY-MM-DD' in shape (the database rejects impossible dates such as 2026-02-31) */
export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

/** Date → 'YYYY-MM-DD' (local time) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dateLabelFormats = new Map<string, Intl.DateTimeFormat>()

/**
 * 'YYYY-MM-DD' → month, day and weekday in the locale's own order and words,
 * e.g. '5월 31일 (일)' in ko, 'Sun, May 31' in en.
 *
 * A date key is a calendar day, not an instant, so it is read and formatted in UTC: that
 * pins it to the day it names whatever zone the server or browser runs in. The user's
 * time zone matters when deciding *which* day is today, not when printing a given one.
 */
export function formatDateLabel(dateKey: string, locale: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  let format = dateLabelFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'UTC',
    })
    dateLabelFormats.set(locale, format)
  }
  return format.format(new Date(Date.UTC(y, m - 1, d)))
}
