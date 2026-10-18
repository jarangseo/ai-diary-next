import { describe, it, expect } from 'vitest'
import { DAILY_MESSAGE_LIMIT, isOverDailyLimit, cappedParts, startOfDayIn } from '../usage'
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

describe('startOfDayIn', () => {
  const start = (tz: string, iso: string) => startOfDayIn(tz, new Date(iso)).toISOString()

  it('UTC+9: 01:00 in Seoul belongs to that Seoul day, not the previous UTC day', () => {
    // 2026-10-18 01:00 KST = 2026-10-17 16:00 UTC; Seoul midnight = 15:00 UTC.
    expect(start('Asia/Seoul', '2026-10-17T16:00:00Z')).toBe('2026-10-17T15:00:00.000Z')
    expect(start('Asia/Seoul', '2026-10-18T14:59:59Z')).toBe('2026-10-17T15:00:00.000Z')
    expect(start('Asia/Seoul', '2026-10-18T15:00:00Z')).toBe('2026-10-18T15:00:00.000Z')
  })

  it('UTC−5: 23:00 in New York is still the same New York day', () => {
    // 2026-01-15 23:00 EST = 2026-01-16 04:00 UTC; New York midnight = 05:00 UTC.
    expect(start('America/New_York', '2026-01-16T04:00:00Z')).toBe('2026-01-15T05:00:00.000Z')
  })

  it('handles a daylight-saving change day (New York, 2026-03-08)', () => {
    // Midnight was still EST (UTC−5) even though 14:00 that day is EDT (UTC−4).
    expect(start('America/New_York', '2026-03-08T18:00:00Z')).toBe('2026-03-08T05:00:00.000Z')
  })

  it('UTC itself is UTC midnight', () => {
    expect(start('UTC', '2026-10-18T03:00:00Z')).toBe('2026-10-18T00:00:00.000Z')
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
    expect(first.type === 'text-delta' && first.delta).toMatch(
      /^오늘은 여기까지 대화할 수 있어요\. 쓴 글은 그대로 저장돼요\./
    )
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
