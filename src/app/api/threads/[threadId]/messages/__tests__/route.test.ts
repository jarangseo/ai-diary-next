// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/threads', () => ({
  getThread: vi.fn(),
  listMessages: vi.fn(),
  appendMessage: vi.fn(),
  deleteMessages: vi.fn(async () => true),
  countUserMessagesToday: vi.fn(async () => 0),
  markThreadCrisis: vi.fn(async () => true),
}))
vi.mock('@/lib/settings', () => ({
  DEFAULT_SETTINGS: { memoryEnabled: true, timezone: 'UTC', locale: 'ko' },
  getSettings: vi.fn(async () => ({
    settings: { memoryEnabled: true, timezone: 'Asia/Seoul', locale: 'ko' },
  })),
}))
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
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
import {
  appendMessage,
  deleteMessages,
  getThread,
  listMessages,
  markThreadCrisis,
} from '@/lib/threads'
import { getDiaryById } from '@/lib/diary'

const THREAD = 'thread-1'
const DIARY = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'

const user = { id: 'm', threadId: THREAD, role: 'user' as const, content: 'x', createdAt: 0 }
const reply = { ...user, role: 'assistant' as const }

// Sends one message and reads the whole response, so onComplete (which stores the reply
// and any offer) has run by the time this resolves.
async function send(text = 'hello') {
  const res = await POST(
    new Request(`http://test/api/threads/${THREAD}/messages?bench=1`, {
      method: 'POST',
      body: JSON.stringify({ text }),
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

describe('POST messages — 다시 시도 after a broken-off reply (#115)', () => {
  const sendRetry = async (retry: boolean) => {
    const res = await POST(
      new Request(`http://test/api/threads/${THREAD}/messages?bench=1`, {
        method: 'POST',
        body: JSON.stringify({ text: 'hello', retry }),
      }),
      { params: Promise.resolve({ threadId: THREAD }) }
    )
    await res.text()
  }

  beforeEach(() => vi.mocked(deleteMessages).mockClear())

  it('reuses the stored message, drops the partial reply, and replies again', async () => {
    vi.mocked(listMessages).mockResolvedValue([
      { ...user, id: 'u1', content: 'hello' },
      { ...reply, id: 'partial', content: '그랬' },
    ])
    await sendRetry(true)
    expect(deleteMessages).toHaveBeenCalledWith(THREAD, ['partial'])
    expect(stored().map((x) => x.role)).toEqual(['assistant'])
  })

  it('without the retry flag, the same text twice is just sent twice', async () => {
    vi.mocked(listMessages).mockResolvedValue([
      { ...user, id: 'u1', content: 'hello' },
      { ...reply, id: 'r1', content: '응?' },
    ])
    await sendRetry(false)
    expect(deleteMessages).not.toHaveBeenCalled()
    expect(stored().map((x) => x.role)).toEqual(['user', 'assistant'])
  })

  it('a retry whose first attempt never reached the server is stored as usual', async () => {
    vi.mocked(listMessages).mockResolvedValue([])
    await sendRetry(true)
    expect(deleteMessages).not.toHaveBeenCalled()
    expect(stored().map((x) => x.role)).toEqual(['user', 'assistant'])
  })
})

describe('POST messages — length', () => {
  const post = (text: string) =>
    POST(
      new Request(`http://test/api/threads/${THREAD}/messages?bench=1`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
      { params: Promise.resolve({ threadId: THREAD }) }
    )

  beforeEach(() => vi.mocked(listMessages).mockResolvedValue([]))

  it('refuses more than 2,000 characters and stores nothing', async () => {
    const res = await post('가'.repeat(2001))
    expect(res.status).toBe(400)
    expect(appendMessage).not.toHaveBeenCalled()
  })

  it('counts by code point, so 2,000 emoji are within the limit', async () => {
    const res = await post('😀'.repeat(2000))
    expect(res.status).toBe(200)
    await res.text()
    expect(stored()[0].role).toBe('user')
  })
})

describe('POST messages — crisis (#77)', () => {
  beforeEach(() => vi.mocked(markThreadCrisis).mockClear())

  it('marks the thread and stores the crisis card with the user’s country after the reply', async () => {
    vi.mocked(listMessages).mockResolvedValue([])
    await send('요즘 죽고 싶다는 생각이 들어')
    expect(markThreadCrisis).toHaveBeenCalledWith(THREAD)
    const s = stored()
    expect(s.map((x) => x.role)).toEqual(['user', 'assistant'])
    expect(s[1].tools).toEqual([{ tool: 'crisis', data: { country: 'KR' } }])
  })

  it('offers no wrap-up on the message that signals it, even on the fourth', async () => {
    vi.mocked(listMessages).mockResolvedValue([user, reply, user, reply, user, reply])
    await send('사라지고 싶어')
    expect(stored().some((x) => x.tools?.some((t) => t.tool === 'wrapup_offer'))).toBe(false)
  })

  it('marks an already-marked thread only once, and shows no card for an everyday message', async () => {
    vi.mocked(getThread).mockResolvedValue({
      id: THREAD,
      kind: 'diary',
      diaryId: DIARY,
      title: '',
      crisisAt: 1,
      createdAt: 0,
      updatedAt: 0,
    })
    vi.mocked(listMessages).mockResolvedValue([])
    await send('오늘 회의가 길었어')
    expect(markThreadCrisis).not.toHaveBeenCalled()
    expect(stored()[1].tools).toBeUndefined()
  })
})
