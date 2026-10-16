// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DiaryRow } from '../supabase'

// A stand-in for the Supabase query builder: every chained call returns the builder, and
// awaiting it (or a terminal call) resolves to whatever the test set. `calls` records the
// chain so tests can assert which filters were applied.
const db = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  calls: [] as [string, ...unknown[]][],
}))

vi.mock('../supabase', () => {
  const builder: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'order', 'insert', 'update', 'delete']) {
    builder[name] = (...args: unknown[]) => {
      db.calls.push([name, ...args])
      return builder
    }
  }
  builder.maybeSingle = async () => db.result
  builder.single = async () => db.result
  builder.then = (resolve: (value: unknown) => void) => resolve(db.result)
  return { supabase: { from: () => builder } }
})

// diary.ts imports the analysis module, which builds an OpenAI client; none of these
// tests reach it.
vi.mock('../emotionAnalysis', () => ({ analyzeEmotion: vi.fn() }))

import { createDiary, deleteDiary, getDiaryById, listDiariesByDate, updateDiary } from '../diary'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'

const row: DiaryRow = {
  id: ID,
  user_id: 'u1',
  date: '2026-10-10',
  title: null,
  content: 'hello',
  is_record_only: false,
  emotion_primary: null,
  emotion_score: null,
  emotion_summary: null,
  emotion_questions: null,
  created_at: '2026-10-10T00:00:00.000Z',
  updated_at: '2026-10-10T00:00:00.000Z',
}

beforeEach(() => {
  db.result = { data: null, error: null }
  db.calls = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getDiaryById', () => {
  it('returns the entry, scoped to the user and the id', async () => {
    db.result = { data: row, error: null }
    await expect(getDiaryById('u1', ID)).resolves.toMatchObject({ id: ID, content: 'hello' })
    expect(db.calls).toContainEqual(['eq', 'user_id', 'u1'])
    expect(db.calls).toContainEqual(['eq', 'id', ID])
  })

  it('returns null when there is no entry', async () => {
    await expect(getDiaryById('u1', ID)).resolves.toBeNull()
  })

  it('answers null for a non-uuid without querying (old date URLs)', async () => {
    await expect(getDiaryById('u1', '2026-10-10')).resolves.toBeNull()
    expect(db.calls).toEqual([])
  })

  it('throws when the query fails, rather than reporting no entry', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(getDiaryById('u1', ID)).rejects.toThrow('fetch failed')
  })
})

describe('listDiariesByDate', () => {
  it('returns every entry on the date', async () => {
    db.result = { data: [row, { ...row, id: 'other' }], error: null }
    const list = await listDiariesByDate('u1', '2026-10-10')
    expect(list.map((d) => d.id)).toEqual([ID, 'other'])
    expect(db.calls).toContainEqual(['eq', 'date', '2026-10-10'])
  })

  it('throws when the query fails', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(listDiariesByDate('u1', '2026-10-10')).rejects.toThrow('fetch failed')
  })
})

describe('createDiary', () => {
  it('always inserts and returns the new id', async () => {
    db.result = { data: { id: ID }, error: null }
    await expect(createDiary('u1', '2026-10-10', 'hello', false)).resolves.toBe(ID)
    expect(db.calls.map(([name]) => name)).toContain('insert')
    expect(db.calls.map(([name]) => name)).not.toContain('update')
  })

  it('returns null when the insert fails', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(createDiary('u1', '2026-10-10', 'hello', false)).resolves.toBeNull()
  })
})

describe('updateDiary', () => {
  it('updates the matched entry', async () => {
    db.result = { data: [{ id: ID }], error: null }
    await expect(updateDiary('u1', ID, { date: '2026-10-10', content: 'x' })).resolves.toBe(
      'updated'
    )
    expect(db.calls).toContainEqual(['eq', 'user_id', 'u1'])
  })

  it('reports not_found when no row matched (someone else’s id)', async () => {
    db.result = { data: [], error: null }
    await expect(updateDiary('u1', ID, { date: '2026-10-10', content: 'x' })).resolves.toBe(
      'not_found'
    )
  })

  it('reports failed when the query fails', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(updateDiary('u1', ID, { date: '2026-10-10', content: 'x' })).resolves.toBe(
      'failed'
    )
  })
})

describe('deleteDiary', () => {
  it('deletes by user and id, never by date', async () => {
    await expect(deleteDiary('u1', ID)).resolves.toBe(true)
    expect(db.calls).toContainEqual(['eq', 'id', ID])
    expect(db.calls.some(([name, col]) => name === 'eq' && col === 'date')).toBe(false)
  })
})
