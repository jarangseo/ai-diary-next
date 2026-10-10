// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DiaryRow } from '../supabase'

// A stand-in for the Supabase query builder: every filter returns the builder, and the
// terminal calls resolve to whatever the test set. Only the calls diary.ts makes exist.
const db = vi.hoisted(() => ({
  lookup: { data: null as unknown, error: null as unknown },
  insert: vi.fn<(row: unknown) => Promise<{ error: null }>>(async () => ({ error: null })),
  update: vi.fn<(fields: unknown) => unknown>(() => ({
    eq: () => ({ eq: async () => ({ error: null }) }),
  })),
}))

vi.mock('../supabase', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => db.lookup,
    insert: (row: unknown) => db.insert(row),
    update: (fields: unknown) => db.update(fields),
  }
  return { supabase: { from: () => builder } }
})

// diary.ts imports the analysis module, which builds an OpenAI client; none of these
// tests reach it.
vi.mock('../emotionAnalysis', () => ({ analyzeEmotion: vi.fn() }))

import { getDiary, saveDiary } from '../diary'

const row: DiaryRow = {
  id: 'd1',
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
  db.lookup = { data: null, error: null }
  db.insert.mockClear()
  db.update.mockClear()
})

describe('getDiary', () => {
  it('returns the entry when there is one', async () => {
    db.lookup = { data: row, error: null }
    await expect(getDiary('u1', '2026-10-10')).resolves.toMatchObject({
      id: 'd1',
      content: 'hello',
    })
  })

  it('returns null when there is no entry', async () => {
    await expect(getDiary('u1', '2026-10-10')).resolves.toBeNull()
  })

  it('throws when the query fails, rather than reporting no entry', async () => {
    db.lookup = { data: null, error: { message: 'fetch failed' } }
    await expect(getDiary('u1', '2026-10-10')).rejects.toThrow('fetch failed')
  })
})

describe('saveDiary', () => {
  it('does not insert when the existence check failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    db.lookup = { data: null, error: { message: 'fetch failed' } }

    await expect(saveDiary('u1', '2026-10-10', 'hello', false)).resolves.toBe(false)
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it('inserts when there is genuinely no entry', async () => {
    await expect(saveDiary('u1', '2026-10-10', 'hello', false)).resolves.toBe(true)
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('updates when an entry exists', async () => {
    db.lookup = { data: row, error: null }
    await expect(saveDiary('u1', '2026-10-10', 'edited', false)).resolves.toBe(true)
    expect(db.update).toHaveBeenCalledOnce()
    expect(db.insert).not.toHaveBeenCalled()
  })
})
