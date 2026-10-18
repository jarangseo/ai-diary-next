import type { Message } from '@/types/thread'

/**
 * When the AI offers "여기까지 일기로 정리해 둘까요?" (decided 2026-10-18, PRODUCT_DIRECTION
 * *Screen specs*): once the user has written this many messages since the start of the
 * conversation or since the last offer.
 */
export const WRAP_UP_EVERY = 4

export function isWrapUpOffer(message: Pick<Message, 'toolResults'>): boolean {
  return message.toolResults?.some((r) => r.tool === 'wrapup_offer') ?? false
}

/**
 * Whether to offer wrap-up after the reply to the newest message. Pure, so the rule is
 * tested on its own.
 *
 * Counting restarts at every offer. That one rule covers both decided cases: the first
 * offer comes after four user messages, and after `조금 더 얘기할게요` (or simply talking on)
 * the next comes four messages later — a decline needs no record of its own.
 *
 * Never:
 * - on an entry that is not a chat entry: a written entry's 일기 is 내 글, never a draft;
 * - once the entry is wrapped up: talking more shows `다시 정리` instead (spec 1-2);
 * - in a conversation with a crisis signal: offering a tidy summary there reads as not
 *   listening (decided 2026-10-18). The user can still wrap up by hand.
 *
 * `messages` is the conversation including the user's newest message.
 */
export function shouldOfferWrapUp({
  messages,
  isChatEntry,
  wrappedUp,
  crisis,
}: {
  messages: Pick<Message, 'role' | 'toolResults'>[]
  isChatEntry: boolean
  wrappedUp: boolean
  crisis: boolean
}): boolean {
  if (!isChatEntry || wrappedUp || crisis) return false

  let sinceLastOffer = 0
  for (const message of messages) {
    if (isWrapUpOffer(message)) sinceLastOffer = 0
    else if (message.role === 'user') sinceLastOffer++
  }
  return sinceLastOffer >= WRAP_UP_EVERY
}
