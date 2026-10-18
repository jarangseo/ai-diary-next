/**
 * Groups entries for the sidebar: 오늘, 어제, 이번 주, then one group per month.
 *
 * An entry's `date` is a calendar day (YYYY-MM-DD) and needs no zone. The zone decides only
 * which day is *today*, and it is the user's stored one, never the server's or the
 * browser's: at 22:00 in New York it is already tomorrow in Seoul, and the same entry
 * belongs to 오늘 for one user and 어제 for the other.
 *
 * Pure: `now` is passed in, so the result depends on nothing but the arguments.
 */

export type EntryGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'month'

export interface EntryGroup<T> {
  key: EntryGroupKey
  /** `YYYY-MM` for a month group, so the caller can format it in the user's locale. */
  month?: string
  items: T[]
}

export interface GroupOptions {
  now: Date
  /** IANA zone, e.g. `Asia/Seoul`. */
  timeZone: string
  /** 0 = Sunday … 6 = Saturday. See `weekStartFor`. */
  weekStartsOn: number
}

interface Groupable {
  date: string
  createdAt: number
}

const DAY_MS = 86_400_000

/** 'YYYY-MM-DD' → whole days since 1970-01-01, for plain integer comparisons. */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/** The calendar day it is at `now` in `timeZone`, as 'YYYY-MM-DD'. */
export function todayIn(now: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD; parts are read individually so the format never matters.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * The first day of the week for a locale (0 = Sunday), from CLDR via `Intl.Locale`.
 * Monday (ISO 8601) where the runtime cannot say — Firefox, older engines, a bad tag.
 */
export function weekStartFor(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const firstDay = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay
    // CLDR numbers the days 1 (Monday) … 7 (Sunday).
    if (typeof firstDay === 'number' && firstDay >= 1 && firstDay <= 7) return firstDay % 7
  } catch {
    // An invalid tag: fall through to the default.
  }
  return 1
}

/**
 * Newest first: groups from today backwards, and within a group the latest day first,
 * then the latest written. A future-dated entry falls into its month's group.
 */
export function groupEntries<T extends Groupable>(
  entries: readonly T[],
  { now, timeZone, weekStartsOn }: GroupOptions
): EntryGroup<T>[] {
  const today = dayNumber(todayIn(now, timeZone))
  const weekday = new Date(today * DAY_MS).getUTCDay()
  const weekStart = today - ((weekday - weekStartsOn + 7) % 7)

  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  )

  const fixed: Record<Exclude<EntryGroupKey, 'month'>, T[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
  }
  const months = new Map<string, T[]>()

  for (const entry of sorted) {
    const day = dayNumber(entry.date)
    if (day === today) fixed.today.push(entry)
    else if (day === today - 1) fixed.yesterday.push(entry)
    else if (day < today && day >= weekStart) fixed.thisWeek.push(entry)
    else {
      const month = entry.date.slice(0, 7)
      const items = months.get(month)
      if (items) items.push(entry)
      else months.set(month, [entry])
    }
  }

  const groups: EntryGroup<T>[] = []
  for (const key of ['today', 'yesterday', 'thisWeek'] as const) {
    if (fixed[key].length) groups.push({ key, items: fixed[key] })
  }
  // Entries are already sorted by date, so months arrive newest first.
  for (const [month, items] of months) groups.push({ key: 'month', month, items })
  return groups
}
