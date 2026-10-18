import { describe, it, expect } from 'vitest'
import { DAILY_MESSAGE_LIMIT, isOverDailyLimit, cappedParts, startOfKoreanDay } from '../usage'
import type { StreamPart } from '@/types/stream'

describe('isOverDailyLimit', () => {
  it('allows requests up to the limit', () => {
    expect(isOverDailyLimit(0)).toBe(false)
    expect(isOverDailyLimit(DAILY_MESSAGE_LIMIT - 1)).toBe(false)
  })

  it('refuses the one that would exceed it', () => {
    // The count is of messages already stored, so having sent N means the next request
    // would be the N+1th — at N === limit it must already be refused.
    expect(isOverDailyLimit(DAILY_MESSAGE_LIMIT)).toBe(true)
    expect(isOverDailyLimit(DAILY_MESSAGE_LIMIT + 5)).toBe(true)
  })

  it('takes an explicit limit, so the policy is not welded to one number', () => {
    expect(isOverDailyLimit(2, 3)).toBe(false)
    expect(isOverDailyLimit(3, 3)).toBe(true)
  })
})

describe('startOfKoreanDay', () => {
  // Midnight in Korea is 15:00 UTC the previous day.
  const day = (iso: string) => startOfKoreanDay(new Date(iso)).toISOString()

  it('counts 01:00 in Korea toward that Korean day, not the previous UTC day', () => {
    expect(day('2026-10-17T16:00:00Z')).toBe('2026-10-17T15:00:00.000Z') // 10/18 01:00 KST
  })

  it('keeps 01:00 and 23:00 Korea time on the same day', () => {
    expect(day('2026-10-18T14:00:00Z')).toBe('2026-10-17T15:00:00.000Z') // 10/18 23:00 KST
  })

  it('starts a new day at midnight Korea time', () => {
    expect(day('2026-10-18T14:59:59Z')).toBe('2026-10-17T15:00:00.000Z') // 23:59:59 KST
    expect(day('2026-10-18T15:00:00Z')).toBe('2026-10-18T15:00:00.000Z') // 00:00 KST
  })

  it('does not depend on the server time zone', () => {
    // Pure UTC arithmetic: the same instant gives the same boundary anywhere.
    const instant = new Date('2026-10-18T03:00:00Z')
    expect(startOfKoreanDay(instant).getTime()).toBe(Date.UTC(2026, 9, 17, 15))
  })
})

describe('cappedParts', () => {
  it('explains itself before falling back to the deterministic stream', async () => {
    const parts: StreamPart[] = []
    for await (const part of cappedParts()) {
      parts.push(part)
      if (parts.length > 3) break
    }

    const [first] = parts
    expect(first.type).toBe('text-delta')
    expect(first.type === 'text-delta' && first.delta).toContain('한도')
    // Degrades rather than refusing: the rest is a real stream, not an error.
    expect(parts.slice(1).every((p) => p.type !== 'error')).toBe(true)
  })

  it('stops immediately when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const parts: StreamPart[] = []
    for await (const part of cappedParts(controller.signal)) parts.push(part)

    // Only the notice — the fake stream behind it yields nothing once aborted.
    expect(parts).toHaveLength(1)
  })
})
