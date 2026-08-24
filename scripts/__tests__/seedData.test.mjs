import { describe, it, expect } from 'vitest'
import { SEED_TITLES, isSeededEntry, shiftDate, buildSeedDates } from '../seedData.mjs'

describe('isSeededEntry', () => {
  it('recognises rows the seed wrote', () => {
    expect(isSeededEntry({ title: SEED_TITLES[0] })).toBe(true)
  })

  it('leaves hand-written entries alone', () => {
    expect(isSeededEntry({ title: null })).toBe(false)
    expect(isSeededEntry({ title: undefined })).toBe(false)
    expect(isSeededEntry({})).toBe(false)
    // The day the app starts generating titles, a "has a title" check would begin
    // deleting real entries. This one will not.
    expect(isSeededEntry({ title: '오늘의 기록' })).toBe(false)
  })

  it('does not depend on the date, which is the bug it exists to fix', () => {
    // Seeded on one day, cleaned on another: the row is still the seed's either way.
    const row = { title: SEED_TITLES[3], date: '2026-06-26' }
    expect(isSeededEntry(row)).toBe(true)
  })
})

describe('buildSeedDates', () => {
  const shape = { entryCount: 60, doubledDays: 5 }

  it('produces one entry per day except the doubled ones', () => {
    const dates = buildSeedDates({ endDate: '2026-08-19', ...shape })
    expect(dates).toHaveLength(60)
    expect(new Set(dates).size).toBe(55)
  })

  it('keeps the newest date single, so the detail page can still resolve it', () => {
    const dates = buildSeedDates({ endDate: '2026-08-19', ...shape })
    const newest = dates.at(-1)
    expect(newest).toBe('2026-08-19')
    expect(dates.filter((d) => d === newest)).toHaveLength(1)
  })

  it('moves with `endDate` — which is why a date range could not identify seeded rows', () => {
    const seeded = buildSeedDates({ endDate: '2026-08-19', ...shape })
    const cleanedFiveDaysLater = buildSeedDates({ endDate: '2026-08-24', ...shape })

    // The five oldest seeded dates fall outside the later window. Cleaning by range on a
    // different day therefore leaves them behind, which is exactly what happened.
    const missed = seeded.filter((d) => !cleanedFiveDaysLater.includes(d))
    expect(missed).toEqual(['2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29', '2026-06-30'])
  })
})

describe('shiftDate', () => {
  it('walks back across a month boundary', () => {
    expect(shiftDate('2026-07-02', 3)).toBe('2026-06-29')
  })

  it('returns the day itself for zero', () => {
    expect(shiftDate('2026-07-02', 0)).toBe('2026-07-02')
  })
})
