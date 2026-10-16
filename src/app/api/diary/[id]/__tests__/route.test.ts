// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/diary', () => ({
  getDiaryById: vi.fn(),
  updateDiary: vi.fn(),
  deleteDiary: vi.fn(),
}))
vi.mock('../../scheduleAnalysis', () => ({ scheduleEmotionAnalysis: vi.fn() }))

import { GET, PATCH } from '../route'
import { getDiaryById, updateDiary } from '@/lib/diary'
import { scheduleEmotionAnalysis } from '../../scheduleAnalysis'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'
const params = { params: Promise.resolve({ id: ID }) }

const get = () => GET(new Request(`http://test/api/diary/${ID}`), params)
const patch = (body: unknown) =>
  PATCH(
    new Request(`http://test/api/diary/${ID}`, { method: 'PATCH', body: JSON.stringify(body) }),
    params
  )

beforeEach(() => {
  vi.mocked(getDiaryById).mockReset()
  vi.mocked(updateDiary).mockReset()
  vi.mocked(scheduleEmotionAnalysis).mockReset()
})

describe('GET /api/diary/[id]', () => {
  it('answers 404 when there is no entry', async () => {
    vi.mocked(getDiaryById).mockResolvedValue(null)
    expect((await get()).status).toBe(404)
  })

  it('answers 500 when the lookup fails, not 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getDiaryById).mockRejectedValue(new Error('getDiaryById failed: fetch failed'))
    expect((await get()).status).toBe(500)
  })
})

describe('PATCH /api/diary/[id]', () => {
  const body = { date: '2026-10-10', content: 'edited' }

  it('updates and re-analyzes the edited content', async () => {
    vi.mocked(updateDiary).mockResolvedValue('updated')
    const res = await patch(body)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, id: ID })
    expect(scheduleEmotionAnalysis).toHaveBeenCalledWith('u1', ID, 'edited')
  })

  it('answers 404 for an entry that is not the user’s, without analysis', async () => {
    vi.mocked(updateDiary).mockResolvedValue('not_found')
    expect((await patch(body)).status).toBe(404)
    expect(scheduleEmotionAnalysis).not.toHaveBeenCalled()
  })

  it('answers 400 without content', async () => {
    expect((await patch({ date: '2026-10-10' })).status).toBe(400)
    expect(updateDiary).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/diary/[id] input', () => {
  it('answers 400 for a date that is not YYYY-MM-DD, before touching the database', async () => {
    const res = await PATCH(
      new Request(`http://test/api/diary/${ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: 'tomorrow', content: 'x' }),
      }),
      { params: Promise.resolve({ id: ID }) }
    )
    expect(res.status).toBe(400)
    expect(updateDiary).not.toHaveBeenCalled()
  })
})
