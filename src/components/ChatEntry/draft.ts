/**
 * What the user is typing into a chat entry, kept on this device (spec 5-2: "쓰던 글은 이
 * 기기에 남아 있어요"), so a dropped connection, a reload or a closed tab loses nothing.
 * Per entry, and removed once sent. Storage can be unavailable (private mode, quota);
 * the composer then simply works without it.
 */
const PREFIX = 'chat-draft:'

export function readDraft(entryId: string): string {
  try {
    return localStorage.getItem(PREFIX + entryId) ?? ''
  } catch {
    return ''
  }
}

export function writeDraft(entryId: string, text: string) {
  try {
    if (text) localStorage.setItem(PREFIX + entryId, text)
    else localStorage.removeItem(PREFIX + entryId)
  } catch {
    // Kept in the input only.
  }
}
