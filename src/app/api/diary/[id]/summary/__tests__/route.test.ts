// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/summary', () => ({ SUMMARY_MAX_LENGTH: 10, saveEditedSummary: vi.fn() }))

import { PATCH } from '../route'
import { auth } from '@/auth'
import { saveEditedSummary } from '@/lib/summary'

const ID = '0b6f3c1e-2d4a-4b8e-9c7f-1a2b3c4d5e6f'
const params = { params: Promise.resolve({ id: ID }) }
const patch = (body: unknown) =>
  PATCH(
    new Request(`http://test/api/diary/${ID}/summary`, {
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    params
  )

beforeEach(() => {
  vi.mocked(saveEditedSummary).mockReset()
})

describe('PATCH /api/diary/[id]/summary', () => {
  it('stores the trimmed edit for the signed-in user and answers when it was made', async () => {
    vi.mocked(saveEditedSummary).mockResolvedValue('updated')
    const res = await patch({ text: '  고친 일기 ' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.editedAt).toBe('number')
    expect(saveEditedSummary).toHaveBeenCalledWith('u1', ID, '고친 일기', expect.any(Date))
  })

  it('refuses a missing, blank, non-string, too long or unparsable text without saving', async () => {
    for (const body of [{}, { text: '   ' }, { text: 3 }, { text: 'x'.repeat(11) }, 'not json']) {
      expect((await patch(body)).status).toBe(400)
    }
    expect(saveEditedSummary).not.toHaveBeenCalled()
  })

  it('answers 404 for an entry that is not the user’s, not a chat entry, or not drafted', async () => {
    vi.mocked(saveEditedSummary).mockResolvedValue('not_found')
    expect((await patch({ text: 'a' })).status).toBe(404)
  })

  it('answers 500 when the save fails, and 401 without a session', async () => {
    vi.mocked(saveEditedSummary).mockResolvedValue('failed')
    expect((await patch({ text: 'a' })).status).toBe(500)
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await patch({ text: 'a' })).status).toBe(401)
  })
})
