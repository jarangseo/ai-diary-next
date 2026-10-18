import { describe, it, expect } from 'vitest'
import { canSendMessage, messageLength, remainingCount, sendsOnEnter } from '../composerRules'

describe('message length', () => {
  it('counts an emoji as one character', () => {
    expect(messageLength('오늘😀')).toBe(3)
  })

  it('shows the remaining count from 1,800 characters', () => {
    expect(remainingCount('가'.repeat(1799))).toBeNull()
    expect(remainingCount('가'.repeat(1800))).toBe(200)
    expect(remainingCount('가'.repeat(2000))).toBe(0)
    expect(remainingCount('가'.repeat(2003))).toBe(-3)
  })
})

describe('canSendMessage', () => {
  it('refuses empty and space-only text', () => {
    expect(canSendMessage('')).toBe(false)
    expect(canSendMessage(' \n\t ')).toBe(false)
    expect(canSendMessage('응')).toBe(true)
  })

  it('allows 2,000 characters and refuses 2,001', () => {
    expect(canSendMessage('가'.repeat(2000))).toBe(true)
    expect(canSendMessage('가'.repeat(2001))).toBe(false)
  })
})

describe('sendsOnEnter', () => {
  const key = (k: string, shiftKey = false, isComposing = false) => ({
    key: k,
    shiftKey,
    isComposing,
  })

  it('sends on Enter on a desktop, not on Shift+Enter', () => {
    expect(sendsOnEnter(key('Enter'), false)).toBe(true)
    expect(sendsOnEnter(key('Enter', true), false)).toBe(false)
  })

  it('never sends on Enter on a touch screen', () => {
    expect(sendsOnEnter(key('Enter'), true)).toBe(false)
  })

  it('never sends while the IME is composing', () => {
    expect(sendsOnEnter(key('Enter', false, true), false)).toBe(false)
  })

  it('ignores other keys', () => {
    expect(sendsOnEnter(key('a'), false)).toBe(false)
  })
})
