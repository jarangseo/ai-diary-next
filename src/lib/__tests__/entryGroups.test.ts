// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { groupEntries, todayIn, weekStartFor } from '../entryGroups'

const entry = (date: string, createdAt = 0) => ({ id: `${date}#${createdAt}`, date, createdAt })

/** Group keys with their entries' dates, which is all most assertions need. */
function shape(groups: ReturnType<typeof groupEntries<ReturnType<typeof entry>>>) {
  return groups.map((g) => [g.month ?? g.key, g.items.map((i) => i.date)])
}

const SEOUL = 'Asia/Seoul' // UTC+9, no daylight saving
const NEW_YORK = 'America/New_York' // UTC−5 in December
const SUNDAY = 0
const MONDAY = 1

// Thursday 2026-12-10 11:00 in Seoul — and still Wednesday 2026-12-09 21:00 in New York.
const NOW = new Date('2026-12-10T02:00:00Z')

describe('todayIn', () => {
  it('reads the calendar day in the given zone, not the runtime’s', () => {
    expect(todayIn(NOW, SEOUL)).toBe('2026-12-10')
    expect(todayIn(NOW, NEW_YORK)).toBe('2026-12-09')
    expect(todayIn(NOW, 'UTC')).toBe('2026-12-10')
  })
})

describe('groupEntries', () => {
  const entries = [
    entry('2026-11-30'),
    entry('2026-12-05'),
    entry('2026-12-06'),
    entry('2026-12-07'),
    entry('2026-12-08'),
    entry('2026-12-09'),
    entry('2026-12-10'),
  ]

  it('groups by today, yesterday, this week and month in UTC+9', () => {
    const groups = groupEntries(entries, { now: NOW, timeZone: SEOUL, weekStartsOn: SUNDAY })
    expect(shape(groups)).toEqual([
      ['today', ['2026-12-10']],
      ['yesterday', ['2026-12-09']],
      ['thisWeek', ['2026-12-08', '2026-12-07', '2026-12-06']],
      ['2026-12', ['2026-12-05']],
      ['2026-11', ['2026-11-30']],
    ])
  })

  it('groups the same entries a day earlier in UTC−5', () => {
    const groups = groupEntries(entries, { now: NOW, timeZone: NEW_YORK, weekStartsOn: SUNDAY })
    expect(shape(groups)).toEqual([
      ['today', ['2026-12-09']],
      ['yesterday', ['2026-12-08']],
      ['thisWeek', ['2026-12-07', '2026-12-06']],
      // Tomorrow, for this user: it falls into its month rather than into 오늘.
      ['2026-12', ['2026-12-10', '2026-12-05']],
      ['2026-11', ['2026-11-30']],
    ])
  })

  it('moves an entry from 오늘 to 어제 at the user’s midnight in UTC+9', () => {
    const one = [entry('2026-12-09')]
    const before = new Date('2026-12-09T14:59:59Z') // 23:59:59 KST
    const after = new Date('2026-12-09T15:00:00Z') // 00:00:00 KST
    const opts = { timeZone: SEOUL, weekStartsOn: SUNDAY }
    expect(groupEntries(one, { ...opts, now: before })[0].key).toBe('today')
    expect(groupEntries(one, { ...opts, now: after })[0].key).toBe('yesterday')
  })

  it('moves an entry from 오늘 to 어제 at the user’s midnight in UTC−5', () => {
    const one = [entry('2026-12-09')]
    const before = new Date('2026-12-10T04:59:59Z') // 23:59:59 EST
    const after = new Date('2026-12-10T05:00:00Z') // 00:00:00 EST
    const opts = { timeZone: NEW_YORK, weekStartsOn: SUNDAY }
    expect(groupEntries(one, { ...opts, now: before })[0].key).toBe('today')
    expect(groupEntries(one, { ...opts, now: after })[0].key).toBe('yesterday')
  })

  it('starts the week on the given day', () => {
    const sunday = [entry('2026-12-06')]
    const opts = { now: NOW, timeZone: SEOUL }
    expect(groupEntries(sunday, { ...opts, weekStartsOn: SUNDAY })[0].key).toBe('thisWeek')
    expect(groupEntries(sunday, { ...opts, weekStartsOn: MONDAY })[0]).toMatchObject({
      key: 'month',
      month: '2026-12',
    })
  })

  it('keeps 어제 even when yesterday was in the previous week', () => {
    // Sunday 2026-12-06 in Seoul, weeks starting on Sunday: Saturday is last week.
    const now = new Date('2026-12-06T03:00:00Z')
    const groups = groupEntries([entry('2026-12-05'), entry('2026-12-04')], {
      now,
      timeZone: SEOUL,
      weekStartsOn: SUNDAY,
    })
    expect(shape(groups)).toEqual([
      ['yesterday', ['2026-12-05']],
      ['2026-12', ['2026-12-04']],
    ])
  })

  it('orders a day’s entries newest first and separates years', () => {
    const groups = groupEntries(
      [entry('2025-12-01'), entry('2026-12-10', 1), entry('2026-12-10', 3), entry('2026-12-10', 2)],
      { now: NOW, timeZone: SEOUL, weekStartsOn: SUNDAY }
    )
    expect(groups[0].items.map((i) => i.createdAt)).toEqual([3, 2, 1])
    expect(groups[1]).toMatchObject({ key: 'month', month: '2025-12' })
  })

  it('returns no groups for no entries', () => {
    expect(groupEntries([], { now: NOW, timeZone: SEOUL, weekStartsOn: SUNDAY })).toEqual([])
  })
})

describe('weekStartFor', () => {
  it('reads the first day of the week from the locale', () => {
    expect(weekStartFor('ko-KR')).toBe(SUNDAY)
    expect(weekStartFor('en-US')).toBe(SUNDAY)
    expect(weekStartFor('de-DE')).toBe(MONDAY)
  })

  it('falls back to Monday for a tag it cannot read', () => {
    expect(weekStartFor('not a locale')).toBe(MONDAY)
  })
})
