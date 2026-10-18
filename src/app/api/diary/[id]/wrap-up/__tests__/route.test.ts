// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/diary', () => ({ getDiaryById: vi.fn(), saveDraft: vi.fn(async () => true) }))
vi.mock('@/lib/threads', () => ({
  getThreadForDiary: vi.fn(async () => ({ id: 't1' })),
  listMessages: vi.fn(),
}))
vi.mock('@/lib/diaryDraft', () => ({
  draftDiary: vi.fn(async () => ({ title: '노을', text: '노을이 예뻤다.' })),
  fakeDraft: vi.fn(),
}))
vi.mock('../../../scheduleAnalysis', () => ({ scheduleEmotionAnalysis: vi.fn() }))

import { POST } from '../route'
import { getDiaryById, saveDraft } from '@/lib/diary'
import { listMessages } from '@/lib/threads'
import { draftDiary } from '@/lib/diaryDraft'
import { scheduleEmotionAnalysis } from '../../../scheduleAnalysis'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'
const said = (createdAt: number) => ({ role: 'user', content: '노을', createdAt })

const wrapUp = (body: unknown = {}) =>
  POST(
    new Request(`http://test/api/diary/${ID}/wrap-up`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    {
      params: Promise.resolve({ id: ID }),
    }
  )

beforeEach(() => {
  delete process.env.E2E_AUTH_SECRET
  vi.mocked(draftDiary).mockClear()
  vi.mocked(saveDraft).mockClear()
  vi.mocked(scheduleEmotionAnalysis).mockClear()
  vi.mocked(getDiaryById).mockResolvedValue({ id: ID, mode: 'chat' } as never)
  vi.mocked(listMessages).mockResolvedValue([said(100)] as never)
})

describe('POST /api/diary/[id]/wrap-up', () => {
  it('drafts, stores and schedules the emotion for a chat entry', async () => {
    const res = await wrapUp()
    expect(res.status).toBe(200)
    expect(saveDraft).toHaveBeenCalledWith(
      'u1',
      ID,
      { title: '노을', text: '노을이 예뻤다.' },
      expect.any(Date)
    )
    expect(scheduleEmotionAnalysis).toHaveBeenCalledWith('u1', ID, '노을이 예뻤다.')
  })

  it('refuses a written entry and an empty conversation', async () => {
    vi.mocked(getDiaryById).mockResolvedValueOnce({ id: ID, mode: 'write' } as never)
    expect((await wrapUp()).status).toBe(400)
    vi.mocked(listMessages).mockResolvedValueOnce([] as never)
    expect((await wrapUp()).status).toBe(400)
    expect(draftDiary).not.toHaveBeenCalled()
  })

  it("answers 404 for an entry that is not the user's", async () => {
    vi.mocked(getDiaryById).mockResolvedValueOnce(null)
    expect((await wrapUp()).status).toBe(404)
  })

  it('makes no model call when nothing was said since the last draft', async () => {
    vi.mocked(getDiaryById).mockResolvedValueOnce({
      id: ID,
      mode: 'chat',
      summary: { text: 'x', madeAt: 200 },
    } as never)
    const res = await wrapUp()
    expect(await res.json()).toMatchObject({ unchanged: true })
    expect(draftDiary).not.toHaveBeenCalled()
  })

  it('asks before replacing an edited draft, and replaces it once confirmed', async () => {
    const edited = { id: ID, mode: 'chat', summary: { text: 'x', madeAt: 50, editedAt: 60 } }
    vi.mocked(getDiaryById).mockResolvedValue(edited as never)
    const asked = await wrapUp()
    expect(asked.status).toBe(409)
    expect(await asked.json()).toMatchObject({ needsConfirm: true })
    expect(draftDiary).not.toHaveBeenCalled()

    expect((await wrapUp({ confirm: true })).status).toBe(200)
    expect(draftDiary).toHaveBeenCalledOnce()
  })

  it('answers 502 when the draft fails, storing nothing', async () => {
    vi.mocked(draftDiary).mockResolvedValueOnce(null)
    expect((await wrapUp()).status).toBe(502)
    expect(saveDraft).not.toHaveBeenCalled()
  })
})
