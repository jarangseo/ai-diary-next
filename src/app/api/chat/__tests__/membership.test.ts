// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The chat-room routes, from the point of view of a signed-in user who is not in the room.
vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/chat', () => ({ getRoom: vi.fn(), getMessages: vi.fn() }))
vi.mock('@/lib/diary', () => ({ createDiary: vi.fn(), analyzeAndStoreEmotion: vi.fn() }))
vi.mock('@/lib/threads', () => ({ countUserMessagesToday: vi.fn() }))
const create = vi.hoisted(() => vi.fn())
vi.mock('openai', () => ({
  OpenAI: class {
    chat = { completions: { create } }
  },
}))

import { GET as getRoomRoute } from '../rooms/[roomId]/route'
import { GET as getMessagesRoute } from '../rooms/[roomId]/messages/route'
import { POST as summarize } from '../summarize/route'
import { getMessages, getRoom } from '@/lib/chat'
import { createDiary } from '@/lib/diary'
import { countUserMessagesToday } from '@/lib/threads'

const params = { params: Promise.resolve({ roomId: 'r1' }) }
const summarizeRequest = () =>
  summarize(
    new Request('http://test/api/chat/summarize', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'r1', date: '2026-10-18' }),
    })
  )

beforeEach(() => {
  vi.mocked(getRoom).mockReset()
  vi.mocked(getMessages).mockReset()
  vi.mocked(createDiary).mockReset()
  vi.mocked(countUserMessagesToday).mockReset()
  create.mockReset()
})

describe('GET /api/chat/rooms/[roomId]', () => {
  it('asks for the room as the signed-in user, and answers 404 when they are not in it', async () => {
    vi.mocked(getRoom).mockResolvedValue(null)
    const res = await getRoomRoute(new Request('http://test'), params)
    expect(res.status).toBe(404)
    expect(getRoom).toHaveBeenCalledWith('u1', 'r1')
  })
})

describe('GET /api/chat/rooms/[roomId]/messages', () => {
  it('answers 404 to a non-member instead of the messages', async () => {
    vi.mocked(getMessages).mockResolvedValue(null)
    const res = await getMessagesRoute(new Request('http://test'), params)
    expect(res.status).toBe(404)
    expect(getMessages).toHaveBeenCalledWith('u1', 'r1')
  })
})

describe('POST /api/chat/summarize', () => {
  it('answers 404 to a non-member, without calling the model or saving a diary', async () => {
    vi.mocked(getMessages).mockResolvedValue(null)
    expect((await summarizeRequest()).status).toBe(404)
    expect(create).not.toHaveBeenCalled()
    expect(createDiary).not.toHaveBeenCalled()
  })

  it('answers 429 over the daily cap, without calling the model', async () => {
    vi.mocked(getMessages).mockResolvedValue([{ type: 'user', content: 'hi' }] as never)
    vi.mocked(countUserMessagesToday).mockResolvedValue(20)
    expect((await summarizeRequest()).status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })

  it('treats an unreadable meter as over the cap', async () => {
    vi.mocked(getMessages).mockResolvedValue([{ type: 'user', content: 'hi' }] as never)
    vi.mocked(countUserMessagesToday).mockResolvedValue(null)
    expect((await summarizeRequest()).status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })
})
