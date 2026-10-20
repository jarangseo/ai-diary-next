// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/diary', () => ({ setUserEmotion: vi.fn() }))

import { PATCH } from '../route'
import { auth } from '@/auth'
import { setUserEmotion } from '@/lib/diary'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'
const params = { params: Promise.resolve({ id: ID }) }
const patch = (body: unknown) =>
  PATCH(
    new Request(`http://test/api/diary/${ID}/emotion`, {
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    params
  )

beforeEach(() => {
  vi.mocked(setUserEmotion).mockReset()
})

describe('PATCH /api/diary/[id]/emotion', () => {
  it('stores the pick as the user’s, with or without a secondary emotion', async () => {
    vi.mocked(setUserEmotion).mockResolvedValue(true)
    expect((await patch({ primary: 'calm', secondary: 'tired' })).status).toBe(200)
    expect(setUserEmotion).toHaveBeenLastCalledWith('u1', ID, 'calm', 'tired')
    expect((await patch({ primary: 'joy', secondary: null })).status).toBe(200)
    expect(setUserEmotion).toHaveBeenLastCalledWith('u1', ID, 'joy', undefined)
    expect((await patch({ primary: 'joy' })).status).toBe(200)
    expect(setUserEmotion).toHaveBeenLastCalledWith('u1', ID, 'joy', undefined)
  })

  it('refuses unknown keys, a secondary equal to the primary, and bad bodies', async () => {
    for (const body of [
      {},
      { primary: 'happy' },
      { primary: '기쁨' },
      { primary: 'joy', secondary: 'joy' },
      { primary: 'joy', secondary: 'nope' },
      'not json',
    ]) {
      expect((await patch(body)).status).toBe(400)
    }
    expect(setUserEmotion).not.toHaveBeenCalled()
  })

  it('answers 404 when the entry is not the user’s, and 401 without a session', async () => {
    vi.mocked(setUserEmotion).mockResolvedValue(false)
    expect((await patch({ primary: 'sad' })).status).toBe(404)
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await patch({ primary: 'sad' })).status).toBe(401)
  })
})
