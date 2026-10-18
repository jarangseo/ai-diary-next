import { describe, it, expect } from 'vitest'
import { shouldOfferWrapUp, WRAP_UP_EVERY } from '../wrapUp'
import type { Message } from '@/types/thread'

type M = Pick<Message, 'role' | 'toolResults'>
const user: M = { role: 'user' }
const reply: M = { role: 'assistant' }
const offer: M = { role: 'assistant', toolResults: [{ tool: 'wrapup_offer' }] }

// n user messages, each followed by a reply, except the newest (it has not been answered).
const exchanges = (n: number): M[] =>
  Array.from({ length: n }, (_, i) => (i < n - 1 ? [user, reply] : [user])).flat()

const chat = { isChatEntry: true, wrappedUp: false, crisis: false }

describe('shouldOfferWrapUp', () => {
  it('waits for four user messages', () => {
    expect(WRAP_UP_EVERY).toBe(4)
    expect(shouldOfferWrapUp({ ...chat, messages: exchanges(3) })).toBe(false)
    expect(shouldOfferWrapUp({ ...chat, messages: exchanges(4) })).toBe(true)
  })

  it('does not ask again until four more after an offer (declined or ignored)', () => {
    const afterOffer = (n: number) => [...exchanges(4), reply, offer, ...exchanges(n)]
    expect(shouldOfferWrapUp({ ...chat, messages: afterOffer(1) })).toBe(false)
    expect(shouldOfferWrapUp({ ...chat, messages: afterOffer(3) })).toBe(false)
    expect(shouldOfferWrapUp({ ...chat, messages: afterOffer(4) })).toBe(true)
  })

  it('counts only user messages, not replies', () => {
    const repliesOnly: M[] = [user, reply, reply, reply, reply, reply, user]
    expect(shouldOfferWrapUp({ ...chat, messages: repliesOnly })).toBe(false)
  })

  it('never offers after a crisis signal', () => {
    expect(shouldOfferWrapUp({ ...chat, crisis: true, messages: exchanges(8) })).toBe(false)
  })

  it('never offers once the entry is wrapped up', () => {
    expect(shouldOfferWrapUp({ ...chat, wrappedUp: true, messages: exchanges(8) })).toBe(false)
  })

  it('never offers on a written entry', () => {
    expect(shouldOfferWrapUp({ ...chat, isChatEntry: false, messages: exchanges(8) })).toBe(false)
  })
})
