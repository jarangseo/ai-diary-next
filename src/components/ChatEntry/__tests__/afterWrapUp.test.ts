import { describe, expect, it } from 'vitest'
import { countSaid, draftCut, saidSince } from '../afterWrapUp'

const user = (content: string, createdAt = 0) => ({ role: 'user' as const, content, createdAt })
const reply = (createdAt = 0) => ({ role: 'assistant' as const, content: '네', createdAt })

describe('draftCut', () => {
  it('cuts after the last message made by the time of the draft', () => {
    expect(draftCut([user('a', 1), reply(2), user('b', 5), reply(6)], 3)).toBe(2)
    expect(draftCut([user('a', 1), reply(3)], 3)).toBe(2)
  })

  it('is 0 when everything came later, and the whole log when nothing did', () => {
    expect(draftCut([user('a', 5)], 3)).toBe(0)
    expect(draftCut([user('a', 1), reply(2)], 9)).toBe(2)
  })
})

describe('countSaid', () => {
  it("counts the user's messages before the cut, not replies, offers or blanks", () => {
    const log = [user('a'), reply(), user('  '), user('b'), reply(), user('c')]
    expect(countSaid(log, 5)).toBe(2)
    expect(countSaid(log, 0)).toBe(0)
  })
})

describe('saidSince', () => {
  it('is true only when the user said something after the cut', () => {
    expect(saidSince([user('a'), reply()], 2)).toBe(false)
    expect(saidSince([user('a'), reply(), reply()], 2)).toBe(false)
    expect(saidSince([user('a'), reply(), user(' ')], 2)).toBe(false)
    expect(saidSince([user('a'), reply(), user('b')], 2)).toBe(true)
  })
})
