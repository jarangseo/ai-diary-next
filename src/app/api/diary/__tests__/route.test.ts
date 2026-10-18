// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/diary', () => ({ createDiary: vi.fn(), listDiariesByDate: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn() }))
vi.mock('../scheduleAnalysis', () => ({ scheduleEmotionAnalysis: vi.fn() }))

import { POST } from '../route'
import { createDiary } from '@/lib/diary'
import { getSettings } from '@/lib/settings'
import { scheduleEmotionAnalysis } from '../scheduleAnalysis'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'
const post = (body: unknown) =>
  POST(new Request('http://test/api/diary', { method: 'POST', body: JSON.stringify(body) }))

const zone = (timezone: string) =>
  vi.mocked(getSettings).mockResolvedValue({
    settings: { timezone, locale: 'ko', memoryEnabled: true },
    stored: true,
  })

beforeEach(() => {
  vi.mocked(createDiary).mockReset().mockResolvedValue(ID)
  vi.mocked(getSettings).mockReset()
  vi.mocked(scheduleEmotionAnalysis).mockReset()
  // 2026-10-18 23:30 UTC: already the 19th in Seoul, still the 18th in New York.
  vi.useFakeTimers({ now: new Date('2026-10-18T23:30:00Z'), toFake: ['Date'] })
})
afterEach(() => vi.useRealTimers())

describe('POST /api/diary, mode chat', () => {
  it('creates an empty chat entry dated today in the user’s stored zone', async () => {
    zone('Asia/Seoul')
    const res = await post({ mode: 'chat' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, id: ID })
    expect(createDiary).toHaveBeenCalledWith('u1', '2026-10-19', '', false, 'chat')

    zone('America/New_York')
    await post({ mode: 'chat' })
    expect(createDiary).toHaveBeenLastCalledWith('u1', '2026-10-18', '', false, 'chat')
  })

  it('never analyzes an entry that has no content yet', async () => {
    zone('UTC')
    await post({ mode: 'chat' })
    expect(scheduleEmotionAnalysis).not.toHaveBeenCalled()
  })

  it('answers 500 rather than guess a zone when settings cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getSettings).mockRejectedValue(new Error('getSettings failed'))
    expect((await post({ mode: 'chat' })).status).toBe(500)
    expect(createDiary).not.toHaveBeenCalled()
  })

  it('answers 400 for a date that is not YYYY-MM-DD', async () => {
    expect((await post({ mode: 'chat', date: 'today' })).status).toBe(400)
    expect(createDiary).not.toHaveBeenCalled()
  })
})

describe('POST /api/diary, mode write (unchanged)', () => {
  it('still requires a date and content', async () => {
    expect((await post({ content: 'x' })).status).toBe(400)
    expect((await post({ date: '2026-10-18' })).status).toBe(400)
    expect(createDiary).not.toHaveBeenCalled()
  })
})
