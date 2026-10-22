// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({
  result: { data: [] as unknown, error: null as unknown },
  calls: [] as [string, ...unknown[]][],
}))
vi.mock('../supabase', () => {
  const builder: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'gte', 'lte', 'lt', 'not', 'order', 'limit']) {
    builder[name] = (...args: unknown[]) => {
      db.calls.push([name, ...args])
      return builder
    }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(db.result)
  return { supabase: { from: () => builder } }
})
const settings = vi.hoisted(() => ({
  value: { memoryEnabled: true, timezone: 'Asia/Seoul', locale: 'ko' },
}))
vi.mock('../settings', () => ({
  getSettings: vi.fn(async () => ({ settings: settings.value, stored: true })),
}))

import {
  MEMORY_DAYS,
  buildMemoryContext,
  buildOlderNotes,
  combineMemory,
  dateKeyMinusDays,
  entryText,
  greetingEntry,
  loadMemoryEntries,
  memoryAnchor,
  memoryFor,
} from '../memory'

beforeEach(() => {
  db.result = { data: [], error: null }
  db.calls = []
  settings.value = { memoryEnabled: true, timezone: 'Asia/Seoul', locale: 'ko' }
})

describe('entryText', () => {
  it('is the draft of a chat entry and 내 글 of a written one', () => {
    expect(entryText({ mode: 'chat', content: '', summary: ' 노을이 예뻤다 ' })).toBe(
      '노을이 예뻤다'
    )
    expect(entryText({ mode: 'chat', content: '', summary: null })).toBe('')
    expect(entryText({ mode: 'write', content: '운동을 다시 시작했다', summary: null })).toBe(
      '운동을 다시 시작했다'
    )
  })
})

describe('dateKeyMinusDays', () => {
  it('counts calendar days across a month and a year', () => {
    expect(dateKeyMinusDays('2026-10-18', 14)).toBe('2026-10-04')
    expect(dateKeyMinusDays('2026-03-05', 14)).toBe('2026-02-19')
    expect(dateKeyMinusDays('2026-01-03', 14)).toBe('2025-12-20')
  })
})

describe('buildMemoryContext', () => {
  it('lists entries newest first with weekday and title', () => {
    const text = buildMemoryContext([
      { id: 'a', date: '2026-10-13', title: '회의', text: '회의 끝나고 지쳤다' },
      { id: 'b', date: '2026-10-17', text: '운동을 다시 시작했다' },
    ])
    expect(text).toBe(
      '- 2026-10-17 Sat: 운동을 다시 시작했다\n- 2026-10-13 Tue "회의": 회의 끝나고 지쳤다'
    )
  })

  it('cuts a long entry and stops before the total cap', () => {
    const long = 'ㄱ'.repeat(1000)
    const one = buildMemoryContext([{ id: 'a', date: '2026-10-17', text: long }])
    expect(one.endsWith('…')).toBe(true)
    expect(one.length).toBeLessThan(450)

    const many = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      text: long,
    }))
    expect(buildMemoryContext(many).length).toBeLessThanOrEqual(4000)
  })

  it('is empty when there is nothing to remember', () => {
    expect(buildMemoryContext([])).toBe('')
    expect(buildMemoryContext([{ id: 'a', date: '2026-10-17', text: '   ' }])).toBe('')
  })
})

describe('loadMemoryEntries', () => {
  it("reads the last two weeks of the user's own calendar, without the current entry", async () => {
    db.result = {
      data: [
        { id: 'now', date: '2026-10-18', title: null, mode: 'chat', content: '', summary: '오늘' },
        { id: 'a', date: '2026-10-17', title: null, mode: 'write', content: '어제', summary: null },
        { id: 'b', date: '2026-10-16', title: null, mode: 'chat', content: '', summary: null },
      ],
      error: null,
    }
    const entries = await loadMemoryEntries('u1', {
      excludeId: 'now',
      timeZone: 'Asia/Seoul',
      now: new Date('2026-10-18T03:00:00Z'), // 12:00 in Seoul
    })
    expect(entries.map((e) => e.id)).toEqual(['a']) // current excluded, empty draft dropped
    expect(MEMORY_DAYS).toBe(14)
    expect(db.calls).toContainEqual(['eq', 'user_id', 'u1'])
    expect(db.calls).toContainEqual(['gte', 'date', '2026-10-04'])
    expect(db.calls).toContainEqual(['lte', 'date', '2026-10-18'])
  })
})

describe('buildOlderNotes', () => {
  it('lists notes newest first, one line each', () => {
    expect(
      buildOlderNotes([
        { date: '2026-09-01', note: '발표 준비가 막막했다' },
        { date: '2026-09-20', note: '엄마와 오래 통화' },
      ])
    ).toBe('- 2026-09-20: 엄마와 오래 통화\n- 2026-09-01: 발표 준비가 막막했다')
  })

  it('keeps only the newest notes that fit the cap', () => {
    const year = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
      note: '운동을 하고 일찍 잤다. 내일은 회의가 있다.',
    }))
    const text = buildOlderNotes(year)
    expect(text.length).toBeLessThanOrEqual(2000)
    expect(text.startsWith('- 2025-12-31')).toBe(true)
  })

  it('is empty without notes', () => {
    expect(buildOlderNotes([])).toBe('')
  })
})

describe('combineMemory', () => {
  it('labels each layer and drops an empty one', () => {
    expect(combineMemory('a', 'b')).toBe('[최근 2주]\na\n\n[그 이전 — 한 줄 메모]\nb')
    expect(combineMemory('', 'b')).toBe('[그 이전 — 한 줄 메모]\nb')
    expect(combineMemory('a', '')).toBe('[최근 2주]\na')
    expect(combineMemory('', '')).toBe('')
  })
})

describe('memoryFor', () => {
  it('is empty and reads no entries when the user turned memory off', async () => {
    settings.value = { ...settings.value, memoryEnabled: false }
    await expect(memoryFor('u1', { id: 'now', date: '2026-10-22' })).resolves.toBe('')
    expect(db.calls).toEqual([])
  })

  it('never throws: a failed read means no memory, not no reply', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(memoryFor('u1')).resolves.toBe('')
  })
})

describe('memory seen from the entry’s date (#128)', () => {
  it('anchors at a past entry’s date, and at today for today, none or a future date', () => {
    expect(memoryAnchor('2026-10-22', '2026-09-10')).toBe('2026-09-10')
    expect(memoryAnchor('2026-10-22', '2026-10-22')).toBe('2026-10-22')
    expect(memoryAnchor('2026-10-22')).toBe('2026-10-22')
    expect(memoryAnchor('2026-10-22', '2026-12-01')).toBe('2026-10-22')
  })

  it('a past entry’s conversation reads nothing dated after it', async () => {
    await memoryFor('u1', { id: 'past', date: '2026-09-10' })
    // The two weeks up to the entry's date…
    expect(db.calls).toContainEqual(['gte', 'date', '2026-08-27'])
    expect(db.calls).toContainEqual(['lte', 'date', '2026-09-10'])
    // …and older notes only before that window.
    expect(db.calls).toContainEqual(['lt', 'date', '2026-08-27'])
    // (order('date', …) passes an options object, not a date.)
    const dates = db.calls
      .filter(([, column, value]) => column === 'date' && typeof value === 'string')
      .map(([, , value]) => value as string)
    expect(dates.length).toBeGreaterThan(0)
    expect(dates.every((value) => value <= '2026-09-10')).toBe(true)
  })
})

describe('greetingEntry (#76)', () => {
  const today = '2026-10-23'
  const entries = [
    { id: 'today', date: '2026-10-23', title: '오늘 쓴 일기' },
    { id: 'untitled', date: '2026-10-22', title: undefined },
    { id: 'yesterday', date: '2026-10-22', title: ' 회의가 길었던 날 ' },
    { id: 'older', date: '2026-10-15', title: '발표 준비' },
    { id: 'tooOld', date: '2026-10-01', title: '한 달 전' },
  ]

  it('picks the newest titled entry before today, with how many days ago', () => {
    expect(greetingEntry(entries, today, true)).toEqual({
      id: 'yesterday',
      title: '회의가 길었던 날',
      daysAgo: 1,
    })
  })

  it('reaches back two weeks and no further', () => {
    const rest = entries.filter((e) => e.id !== 'yesterday')
    expect(greetingEntry(rest, today, true)?.id).toBe('older')
    expect(greetingEntry(rest, today, true)?.daysAgo).toBe(8)
    expect(greetingEntry([entries[4]], today, true)).toBe(null)
  })

  it('is none with memory off, or with only today’s entries', () => {
    expect(greetingEntry(entries, today, false)).toBe(null)
    expect(greetingEntry([entries[0]], today, true)).toBe(null)
  })
})
