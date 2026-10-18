/**
 * Hands the home's first message to the entry page it navigates to.
 *
 * The text never goes in the URL, where it would sit in browser history, server logs and
 * analytics. sessionStorage is per tab and is gone when the tab closes, and the key
 * carries the new entry's id, so a message can only ever start the entry it was written
 * for.
 *
 * The 대화 중 screen (#82) calls `takeFirstMessage(id)` once on mount and, when it returns
 * text, sends it as the thread's first message. Until then the message waits here.
 */
const PREFIX = 'first-message:'

/** Returns false when storage is unavailable (private mode, quota) so the caller can keep the text. */
export function stashFirstMessage(entryId: string, text: string): boolean {
  try {
    sessionStorage.setItem(PREFIX + entryId, text)
    return true
  } catch {
    return false
  }
}

/** Reads and removes the message, so a reload never sends it a second time. */
export function takeFirstMessage(entryId: string): string | null {
  try {
    const key = PREFIX + entryId
    const text = sessionStorage.getItem(key)
    sessionStorage.removeItem(key)
    return text
  } catch {
    return null
  }
}
