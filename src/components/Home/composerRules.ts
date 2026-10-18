/**
 * The input rules for a message (spec 1-0, decided 2026-10-18). Pure, so each rule has a
 * unit test as well as an E2E.
 */

/** One message holds at most this many characters. */
export const MESSAGE_MAX = 2000
/** From this length on, the remaining count is shown. */
export const COUNTER_FROM = 1800

/**
 * Characters as a person counts them: by code point, so an emoji is one, not two UTF-16
 * units. Korean syllables are one either way.
 */
export function messageLength(text: string): number {
  return Array.from(text).length
}

/** What is left (negative once over), or null while the count is not shown yet. */
export function remainingCount(text: string): number | null {
  const length = messageLength(text)
  return length >= COUNTER_FROM ? MESSAGE_MAX - length : null
}

/** Something other than spaces, and not over the limit. */
export function canSendMessage(text: string): boolean {
  return text.trim().length > 0 && messageLength(text) <= MESSAGE_MAX
}

/**
 * Whether a key press sends. On a desktop, Enter sends and Shift+Enter is a new line. On a
 * touch screen Enter is always a new line and only the button sends. Never while an IME
 * is composing: Enter there confirms the Korean syllable, not the message.
 */
export function sendsOnEnter(
  event: { key: string; shiftKey: boolean; isComposing: boolean },
  touch: boolean
): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing && !touch
}
