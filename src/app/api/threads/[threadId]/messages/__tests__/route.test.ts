// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/threads', () => ({
  getThread: vi.fn(),
  listMessages: vi.fn(),
  appendMessage: vi.fn(),
  countUserMessagesToday: vi.fn(async () => 0),
}))
vi.mock('@/lib/diary', () => ({ getDiaryById: vi.fn() }))
vi.mock('@/lib/memory', () => ({ memoryFor: vi.fn(async () => '') }))
// The model path is never taken here (bench=1). The fake stream paces itself like a real
// model, which is right for the UI and too slow for a unit test, so a one-line reply
// stands in for it.
vi.mock('@/lib/modelStream', () => ({ modelParts: vi.fn() }))
vi.mock('@/lib/fakeStream', () => ({
  fakeParts: async function* () {
    yield { type: 'text-delta', delta: '그랬군요.' }
    yield { type: 'done' }
  },
}))

import { POST } from '../route'
import { appendMessage, getThread, listMessages } from '@/lib/threads'
import { getDiaryById } from '@/lib/diary'

const THREAD = 'thread-1'
const DIARY = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'

const user = { id: 'm', threadId: THREAD, role: 'user' as const, content: 'x', createdAt: 0 }
const reply = { ...user, role: 'assistant' as const }

// Sends one message and reads the whole response, so onComplete (which stores the reply
// and any offer) has run by the time this resolves.
async function send() {
  const res = await POST(
    new Request(`http://test/api/threads/${THREAD}/messages?bench=1`, {
      method: 'POST',
      body: JSON.stringify({ text: 'hello' }),
    }),
    { params: Promise.resolve({ threadId: THREAD }) }
  )
  await res.text()
}

const stored = () =>
  vi.mocked(appendMessage).mock.calls.map(([, role, content, tools]) => ({ role, content, tools }))

beforeEach(() => {
  vi.mocked(appendMessage).mockReset()
  vi.mocked(appendMessage).mockImplementation(async (threadId, role, content) => ({
    ...user,
    role,
    content,
  }))
  vi.mocked(getThread).mockResolvedValue({
    id: THREAD,
    kind: 'diary',
    diaryId: DIARY,
    title: '',
    createdAt: 0,
    updatedAt: 0,
  })
  vi.mocked(getDiaryById).mockResolvedValue({ mode: 'chat' } as never)
})

describe('POST messages — wrap-up offer', () => {
  it('stores the offer after the reply on the fourth user message of a chat entry', async () => {
    vi.mocked(listMessages).mockResolvedValue([user, reply, user, reply, user, reply])
    await send()

    const s = stored()
    expect(s.map((x) => x.role)).toEqual(['user', 'assistant', 'assistant'])
    expect(s[2]).toEqual({ role: 'assistant', content: '', tools: [{ tool: 'wrapup_offer' }] })
  })

  it('stores no offer on the third', async () => {
    vi.mocked(listMessages).mockResolvedValue([user, reply, user, reply])
    await send()
    expect(stored().some((x) => x.tools?.some((t) => t.tool === 'wrapup_offer'))).toBe(false)
  })

  it('stores no offer on a written entry', async () => {
    vi.mocked(getDiaryById).mockResolvedValue({ mode: 'write' } as never)
    vi.mocked(listMessages).mockResolvedValue([user, reply, user, reply, user, reply])
    await send()
    expect(stored()).toHaveLength(2)
  })

  it('still replies when the entry lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getDiaryById).mockRejectedValue(new Error('getDiaryById failed'))
    vi.mocked(listMessages).mockResolvedValue([user, reply, user, reply, user, reply])
    await send()
    expect(stored().map((x) => x.role)).toEqual(['user', 'assistant'])
  })
})
