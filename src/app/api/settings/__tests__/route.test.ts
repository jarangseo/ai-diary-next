// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const session = vi.hoisted(() => ({ value: { user: { id: 'u1' } } as unknown }))
vi.mock('@/auth', () => ({ auth: vi.fn(async () => session.value) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(),
  initSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

import { GET, PATCH, POST } from '../route'
import { initSettings, updateSettings } from '@/lib/settings'

const req = (method: string, body: unknown) =>
  new Request('http://test/api/settings', { method, body: JSON.stringify(body) })

beforeEach(() => {
  session.value = { user: { id: 'u1' } }
  vi.mocked(initSettings).mockReset()
  vi.mocked(updateSettings).mockReset()
})

describe('/api/settings', () => {
  it('refuses every method without a session', async () => {
    session.value = null
    expect((await GET()).status).toBe(401)
    expect((await POST(req('POST', {}))).status).toBe(401)
    expect((await PATCH(req('PATCH', {}))).status).toBe(401)
  })

  it('answers 400 for invalid settings', async () => {
    vi.mocked(updateSettings).mockResolvedValue('invalid')
    expect((await PATCH(req('PATCH', { timezone: 'Mars/Olympus' }))).status).toBe(400)
  })

  it('always writes the session user, never an id from the body', async () => {
    vi.mocked(updateSettings).mockResolvedValue('ok')
    vi.mocked(initSettings).mockResolvedValue('ok')

    await PATCH(req('PATCH', { userId: 'someone-else', memoryEnabled: false }))
    await POST(req('POST', { user_id: 'someone-else', timezone: 'UTC', locale: 'ko' }))

    expect(updateSettings).toHaveBeenCalledWith('u1', {
      memoryEnabled: false,
      timezone: undefined,
      locale: undefined,
    })
    expect(initSettings).toHaveBeenCalledWith('u1', { timezone: 'UTC', locale: 'ko' })
  })

  it('treats a body that is not JSON as invalid, not a crash', async () => {
    vi.mocked(updateSettings).mockResolvedValue('invalid')
    const bad = new Request('http://test/api/settings', { method: 'PATCH', body: 'not json' })
    expect((await PATCH(bad)).status).toBe(400)
  })
})
