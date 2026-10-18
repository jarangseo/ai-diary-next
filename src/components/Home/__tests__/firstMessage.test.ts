import { describe, it, expect, beforeEach, vi } from 'vitest'
import { stashFirstMessage, takeFirstMessage } from '../firstMessage'

beforeEach(() => sessionStorage.clear())

describe('first-message hand-off', () => {
  it('gives the message to its own entry, once', () => {
    expect(stashFirstMessage('a', '오늘은 길었어')).toBe(true)
    expect(takeFirstMessage('b')).toBeNull()
    expect(takeFirstMessage('a')).toBe('오늘은 길었어')
    expect(takeFirstMessage('a')).toBeNull()
  })

  it('reports a storage failure instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(stashFirstMessage('a', 'x')).toBe(false)
    spy.mockRestore()
  })
})
