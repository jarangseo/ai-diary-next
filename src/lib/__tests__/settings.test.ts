// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// A stand-in for the Supabase query builder that records the chain and resolves to
// whatever the test set.
const db = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  calls: [] as [string, ...unknown[]][],
}))

vi.mock('../supabase', () => {
  const builder: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'upsert', 'delete']) {
    builder[name] = (...args: unknown[]) => {
      db.calls.push([name, ...args])
      return builder
    }
  }
  builder.maybeSingle = async () => db.result
  builder.then = (resolve: (value: unknown) => void) => resolve(db.result)
  return { supabase: { from: () => builder } }
})

import {
  DEFAULT_SETTINGS,
  getSettings,
  initSettings,
  isValidLocale,
  isValidTimeZone,
  updateSettings,
} from '../settings'

beforeEach(() => {
  db.result = { data: null, error: null }
  db.calls = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const upsertArgs = () => db.calls.find(([name]) => name === 'upsert')

describe('isValidTimeZone', () => {
  it('accepts IANA names, including ones with daylight saving time', () => {
    for (const tz of ['Asia/Seoul', 'America/New_York', 'Europe/Berlin', 'UTC']) {
      expect(isValidTimeZone(tz)).toBe(true)
    }
  })

  it('rejects anything Intl does not know, and non-strings', () => {
    for (const tz of ['Mars/Olympus', 'KST+9', '', 'x'.repeat(65), 9, null, undefined]) {
      expect(isValidTimeZone(tz)).toBe(false)
    }
  })
})

describe('isValidLocale', () => {
  it('accepts BCP 47 tags', () => {
    for (const l of ['ko', 'ko-KR', 'en-US', 'ja']) expect(isValidLocale(l)).toBe(true)
  })

  it('rejects malformed tags', () => {
    for (const l of ['', 'not a locale', '12', null]) expect(isValidLocale(l)).toBe(false)
  })
})

describe('getSettings', () => {
  it('gives the defaults, marked unstored, when the user has no row', async () => {
    await expect(getSettings('u1')).resolves.toEqual({ settings: DEFAULT_SETTINGS, stored: false })
  })

  it('maps a stored row', async () => {
    db.result = {
      data: { user_id: 'u1', memory_enabled: false, timezone: 'Asia/Seoul', locale: 'ko-KR' },
      error: null,
    }
    await expect(getSettings('u1')).resolves.toEqual({
      settings: { memoryEnabled: false, timezone: 'Asia/Seoul', locale: 'ko-KR' },
      stored: true,
    })
    expect(db.calls).toContainEqual(['eq', 'user_id', 'u1'])
  })

  it('throws on a failed query instead of quietly falling back to UTC', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(getSettings('u1')).rejects.toThrow('fetch failed')
  })
})

describe('initSettings', () => {
  it('stores the browser values without overwriting an existing row', async () => {
    await expect(initSettings('u1', { timezone: 'Asia/Seoul', locale: 'ko-KR' })).resolves.toBe(
      'ok'
    )
    const [, row, options] = upsertArgs()!
    expect(row).toEqual({ user_id: 'u1', timezone: 'Asia/Seoul', locale: 'ko-KR' })
    expect(options).toEqual({ onConflict: 'user_id', ignoreDuplicates: true })
  })

  it('rejects an unknown zone or locale without writing', async () => {
    await expect(initSettings('u1', { timezone: 'Mars/Olympus', locale: 'ko' })).resolves.toBe(
      'invalid'
    )
    await expect(initSettings('u1', { timezone: 'UTC', locale: 'not a locale' })).resolves.toBe(
      'invalid'
    )
    expect(upsertArgs()).toBeUndefined()
  })

  it('reports a failed write', async () => {
    db.result = { data: null, error: { message: 'fetch failed' } }
    await expect(initSettings('u1', { timezone: 'UTC', locale: 'ko' })).resolves.toBe('failed')
  })
})

describe('updateSettings', () => {
  it('writes only the fields given', async () => {
    await expect(updateSettings('u1', { memoryEnabled: false })).resolves.toBe('ok')
    const [, row] = upsertArgs()!
    expect(row).toMatchObject({ user_id: 'u1', memory_enabled: false })
    expect(row).not.toHaveProperty('timezone')
    expect(row).not.toHaveProperty('locale')
  })

  it('validates each field', async () => {
    await expect(updateSettings('u1', { memoryEnabled: 'yes' })).resolves.toBe('invalid')
    await expect(updateSettings('u1', { timezone: 'Mars/Olympus' })).resolves.toBe('invalid')
    await expect(updateSettings('u1', { locale: '' })).resolves.toBe('invalid')
    expect(upsertArgs()).toBeUndefined()
  })

  it('treats an empty change as invalid', async () => {
    await expect(updateSettings('u1', {})).resolves.toBe('invalid')
  })
})
