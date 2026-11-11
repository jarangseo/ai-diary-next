import { describe, it, expect } from 'vitest'
import { chipLabels } from '../chipLabels'

const ko = { locale: 'ko', currentYear: 2026 }

describe('chipLabels', () => {
  it('words a date of this year without the year', () => {
    expect(chipLabels([{ id: 'a', date: '2026-10-20' }], ko)).toEqual([
      { id: 'a', kind: 'plain', date: '10월 20일' },
    ])
  })

  it('adds the year for another year, so last November is not read as last week', () => {
    expect(chipLabels([{ id: 'a', date: '2025-11-03' }], ko)).toEqual([
      { id: 'a', kind: 'plain', date: '2025년 11월 3일' },
    ])
  })

  it('tells two chips on one date apart by title, or by number without one', () => {
    expect(
      chipLabels(
        [
          { id: 'a', date: '2026-10-20', title: '아침 산책' },
          { id: 'b', date: '2026-10-19' },
          { id: 'c', date: '2026-10-20' },
        ],
        ko
      )
    ).toEqual([
      { id: 'a', kind: 'titled', date: '10월 20일', title: '아침 산책' },
      { id: 'b', kind: 'plain', date: '10월 19일' },
      { id: 'c', kind: 'numbered', date: '10월 20일', n: 2 },
    ])
  })
})
