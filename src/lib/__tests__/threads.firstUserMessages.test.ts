// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({
  result: { data: [] as unknown, error: null as unknown },
  calls: [] as [string, ...unknown[]][],
  queries: 0,
}))
vi.mock('../supabase', () => {
  const builder: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'in', 'order', 'limit']) {
    builder[name] = (...args: unknown[]) => {
      db.calls.push([name, ...args])
      return builder
    }
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(db.result)
  return {
    supabase: {
      from: () => {
        db.queries++
        return builder
      },
    },
  }
})
vi.mock('../settings', () => ({ getSettings: vi.fn() }))

import { firstUserMessages } from '../threads'

beforeEach(() => {
  db.result = { data: [], error: null }
  db.calls = []
  db.queries = 0
})

const row = (diary: string, content: string) => ({ content, threads: { diary_id: diary } })

describe('firstUserMessages', () => {
  it('reads every entry in one query and keeps each entry’s first message', async () => {
    db.result = {
      data: [row('a', 'a first'), row('b', 'b first'), row('a', 'a second'), row('b', 'b second')],
      error: null,
    }
    const first = await firstUserMessages('u1', ['a', 'b', 'c'])
    expect(db.queries).toBe(1)
    expect(Object.fromEntries(first)).toEqual({ a: 'a first', b: 'b first' })
  })

  it('stays one query however many entries are asked for', async () => {
    await firstUserMessages(
      'u1',
      Array.from({ length: 40 }, (_, i) => `d${i}`)
    )
    expect(db.queries).toBe(1)
  })

  it('is scoped to the user, user messages only, oldest first', async () => {
    await firstUserMessages('u1', ['a'])
    expect(db.calls).toContainEqual(['eq', 'threads.user_id', 'u1'])
    expect(db.calls).toContainEqual(['eq', 'role', 'user'])
    expect(db.calls).toContainEqual(['order', 'created_at', { ascending: true }])
  })

  it('makes no query for no entries, and throws when the query fails', async () => {
    await expect(firstUserMessages('u1', [])).resolves.toEqual(new Map())
    expect(db.queries).toBe(0)
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(firstUserMessages('u1', ['a'])).rejects.toThrow('fetch failed')
  })
})
