// Crisis lines per country (#77). Data, not copy: the names and the closing words come
// from messages/<locale>.json (`Crisis.*`), keyed by these ids. Shared by the server
// (which picks the country) and the card (which renders the lines).
//
// ⚠️ Safety-critical. Every number here is checked by a person before it ships, and again
// whenever a country is added (docs/PRODUCT_DIRECTION.md, *Trust and safety*).

export interface CrisisLine {
  /** Message key under `Crisis.lines`. */
  id: string
  /** What `tel:` dials. */
  tel: string
}

export interface CountryLines {
  lines: CrisisLine[]
  /** Message key under `Crisis.emergency`: who to call in immediate danger. */
  emergency: string
}

export const CRISIS_LINES: Record<string, CountryLines> = {
  KR: {
    lines: [
      { id: 'kr109', tel: '109' }, // 자살예방상담전화, 24시간
      { id: 'kr15770199', tel: '1577-0199' }, // 정신건강위기상담전화, 24시간
    ],
    emergency: 'kr', // 112 (police) · 119 (fire and ambulance)
  },
}

/**
 * Where a user from a country without lines here is sent.
 *
 * TODO(#77): choose the international directory before v2.0 ships. Until a person picks
 * one and checks it, the card shows a visible placeholder instead of a link
 * (`Crisis.internationalPending`), so the gap cannot go unnoticed.
 */
export const INTERNATIONAL_DIRECTORY_URL: string | null = null

export function linesFor(country: string | null): CountryLines | null {
  return (country && CRISIS_LINES[country]) || null
}
