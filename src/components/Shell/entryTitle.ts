// The spec's title before wrap-up (decided 2026-10-18): the first 30 characters of the
// first thing written — a chat entry's first message, a written entry's text. The header
// and the sidebar both use this, so they always agree.
const TITLE_LENGTH = 30

export function titleFromText(text: string): string {
  const firstLine = text.trim().split('\n', 1)[0].trim()
  // By code point, so an emoji or a combining mark is never cut in half.
  return Array.from(firstLine).slice(0, TITLE_LENGTH).join('')
}
