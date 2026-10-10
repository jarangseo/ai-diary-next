// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/diary', () => ({ getDiary: vi.fn(), deleteDiary: vi.fn() }))

import { GET } from '../route'
import { getDiary } from '@/lib/diary'

const call = () =>
  GET(new Request('http://test/api/diary/2026-10-10'), {
    params: Promise.resolve({ date: '2026-10-10' }),
  })

beforeEach(() => {
  vi.mocked(getDiary).mockReset()
})

describe('GET /api/diary/[date]', () => {
  it('answers 404 when there is no entry', async () => {
    vi.mocked(getDiary).mockResolvedValue(null)
    expect((await call()).status).toBe(404)
  })

  it('answers 500 when the lookup fails, not 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getDiary).mockRejectedValue(new Error('getDiary failed: fetch failed'))
    expect((await call()).status).toBe(500)
  })
})
