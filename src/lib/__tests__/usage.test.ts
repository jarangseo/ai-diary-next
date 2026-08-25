import { describe, it, expect } from 'vitest'
import { DAILY_MESSAGE_LIMIT, isOverDailyLimit, cappedParts } from '../usage'
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
