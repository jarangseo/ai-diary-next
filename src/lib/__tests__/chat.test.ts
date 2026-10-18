// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// A stand-in for the Supabase query builder that remembers which table each chain started
// on. `results` answers per table; `calls` records every step as [table, method, ...args],
// so tests can assert both the filters and the order of deletes.
const db = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown; error: unknown }>,
  calls: [] as [string, string, ...unknown[]][],
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const answer = () => db.results[table] ?? { data: null, error: null }
      const builder: Record<string, unknown> = {}
      for (const name of ['select', 'eq', 'in', 'order', 'insert', 'delete', 'upsert']) {
        builder[name] = (...args: unknown[]) => {
          db.calls.push([table, name, ...args])
          return builder
        }
      }
      builder.maybeSingle = async () => answer()
      builder.single = async () => answer()
      builder.then = (resolve: (value: unknown) => void) => resolve(answer())
      return builder
    },
  },
}))

import { deleteChatDataForUser, getMessages, getRoom, isRoomMember } from '../chat'

beforeEach(() => {
  db.results = {}
  db.calls = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('isRoomMember', () => {
  it('checks membership by both room and user', async () => {
    db.results.room_members = { data: { room_id: 'r1' }, error: null }
    await expect(isRoomMember('u1', 'r1')).resolves.toBe(true)
    expect(db.calls).toContainEqual(['room_members', 'eq', 'room_id', 'r1'])
    expect(db.calls).toContainEqual(['room_members', 'eq', 'user_id', 'u1'])
  })

  it('is false when there is no membership row', async () => {
    await expect(isRoomMember('u1', 'r1')).resolves.toBe(false)
  })

  it('is false when the lookup fails, rather than letting the caller in', async () => {
    db.results.room_members = { data: null, error: { message: 'fetch failed' } }
    await expect(isRoomMember('u1', 'r1')).resolves.toBe(false)
  })
})

describe('getMessages', () => {
  it('returns null for a non-member without reading any message', async () => {
    await expect(getMessages('u1', 'r1')).resolves.toBeNull()
    expect(db.calls.some(([table]) => table === 'chat_messages')).toBe(false)
  })

  it('returns the room’s messages to a member', async () => {
    db.results.room_members = { data: { room_id: 'r1' }, error: null }
    db.results.chat_messages = { data: [{ id: 'm1' }], error: null }
    await expect(getMessages('u1', 'r1')).resolves.toEqual([{ id: 'm1' }])
  })
})

describe('getRoom', () => {
  it('returns null for a non-member without reading the room', async () => {
    await expect(getRoom('u1', 'r1')).resolves.toBeNull()
    expect(db.calls.some(([table]) => table === 'chat_rooms')).toBe(false)
  })
})

describe('deleteChatDataForUser', () => {
  it('removes owned rooms (children first), then the user’s own messages and memberships', async () => {
    db.results.chat_rooms = { data: [{ id: 'r1' }, { id: 'r2' }], error: null }
    await expect(deleteChatDataForUser('u1')).resolves.toBe(true)

    const deletes = db.calls
      .filter(([, method]) => method === 'in' || method === 'eq')
      .filter(([table, , column]) => !(table === 'chat_rooms' && column === 'owner_id'))
    expect(deletes).toEqual([
      ['chat_messages', 'in', 'room_id', ['r1', 'r2']],
      ['room_members', 'in', 'room_id', ['r1', 'r2']],
      ['chat_rooms', 'in', 'id', ['r1', 'r2']],
      ['chat_messages', 'eq', 'user_id', 'u1'],
      ['room_members', 'eq', 'user_id', 'u1'],
    ])
  })

  it('skips the room deletes when the user owns no room', async () => {
    db.results.chat_rooms = { data: [], error: null }
    await expect(deleteChatDataForUser('u1')).resolves.toBe(true)
    expect(db.calls.some(([, method]) => method === 'in')).toBe(false)
  })

  it('reports failure when a delete fails', async () => {
    db.results.chat_rooms = { data: [], error: null }
    db.results.chat_messages = { data: null, error: { message: 'fetch failed' } }
    await expect(deleteChatDataForUser('u1')).resolves.toBe(false)
  })
})
