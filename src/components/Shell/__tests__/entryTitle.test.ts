import { describe, expect, it } from 'vitest'
import { titleFromText } from '../entryTitle'

describe('titleFromText', () => {
  it('keeps the first 30 characters of the first line', () => {
    const text = '가나다라마바사아자차카타파하'.repeat(3)
    expect(titleFromText(text)).toBe(text.slice(0, 30))
    expect(titleFromText('  첫 줄\n둘째 줄')).toBe('첫 줄')
  })

  it('counts by code point, so an emoji is never cut in half', () => {
    const text = '😀'.repeat(31)
    expect(titleFromText(text)).toBe('😀'.repeat(30))
  })

  it('is empty for empty text', () => {
    expect(titleFromText('   ')).toBe('')
  })
})
