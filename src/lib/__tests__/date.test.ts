import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDateLabel, isDateKey, toDateKey } from '../date'

describe('formatDateLabel', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('formats a date key in Korean with month, day and weekday', () => {
    expect(formatDateLabel('2026-05-31', 'ko')).toBe('5월 31일 (일)')
    expect(formatDateLabel('2026-10-16', 'ko')).toBe('10월 16일 (금)')
  })

  it("follows the locale's own order and words", () => {
    expect(formatDateLabel('2026-05-31', 'en-US')).toBe('Sun, May 31')
    expect(formatDateLabel('2026-05-31', 'ja')).toBe('5月31日(日)')
  })

  it('handles month and year boundaries and leap days', () => {
    expect(formatDateLabel('2026-01-01', 'ko')).toBe('1월 1일 (목)')
    expect(formatDateLabel('2025-12-31', 'ko')).toBe('12월 31일 (수)')
    expect(formatDateLabel('2028-02-29', 'ko')).toBe('2월 29일 (화)')
  })

  // A date key names a day, so the runtime's zone must not shift it. Node applies a TZ
  // change at runtime, which is enough to catch a helper that builds a local-time Date.
  it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Seoul'])(
    'prints the same day when the runtime zone is %s',
    (zone) => {
      vi.stubEnv('TZ', zone)
      expect(formatDateLabel('2026-05-31', 'ko')).toBe('5월 31일 (일)')
    }
  )
})

describe('toDateKey / isDateKey', () => {
  it('round-trips a local date', () => {
    const key = toDateKey(new Date(2026, 4, 31))
    expect(key).toBe('2026-05-31')
    expect(isDateKey(key)).toBe(true)
  })

  it('rejects other shapes', () => {
    expect(isDateKey('2026-5-31')).toBe(false)
    expect(isDateKey('not-a-date')).toBe(false)
  })
})
