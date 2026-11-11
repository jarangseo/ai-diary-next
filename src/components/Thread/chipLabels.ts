import type { SourceEntry } from '@/types/thread'

/**
 * What each source chip says, before translation (#76). The date is worded by the locale,
 * with the year only when it is not this year, so a chip to last November does not read
 * as last week. Two chips on the same date are told apart by the entry's title, or by a
 * number when it has none, so no two links share a name (WCAG 2.4.4).
 */
export type ChipLabel =
  | { id: string; kind: 'plain'; date: string }
  | { id: string; kind: 'titled'; date: string; title: string }
  | { id: string; kind: 'numbered'; date: string; n: number }

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(locale: string, withYear: boolean): Intl.DateTimeFormat {
  const key = `${locale}|${withYear}`
  let format = formatters.get(key)
  if (!format) {
    // Read in UTC: `date` is a calendar date, and no zone may move it to another day.
    format = new Intl.DateTimeFormat(locale, {
      ...(withYear ? { year: 'numeric' } : {}),
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
    formatters.set(key, format)
  }
  return format
}

export function chipLabels(
  entries: SourceEntry[],
  { locale, currentYear }: { locale: string; currentYear: number }
): ChipLabel[] {
  const perDate = new Map<string, number>()
  for (const entry of entries) perDate.set(entry.date, (perDate.get(entry.date) ?? 0) + 1)
  const seen = new Map<string, number>()

  return entries.map((entry) => {
    const withYear = Number(entry.date.slice(0, 4)) !== currentYear
    const date = formatter(locale, withYear).format(new Date(`${entry.date}T00:00:00Z`))
    if ((perDate.get(entry.date) ?? 0) < 2) return { id: entry.id, kind: 'plain', date }
    const n = (seen.get(entry.date) ?? 0) + 1
    seen.set(entry.date, n)
    const title = entry.title?.trim()
    return title
      ? { id: entry.id, kind: 'titled', date, title }
      : { id: entry.id, kind: 'numbered', date, n }
  })
}
