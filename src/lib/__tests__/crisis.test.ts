// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import {
  countryFor,
  decideCrisis,
  matchesCrisisPhrase,
  moderationSignal,
  MODERATION_THRESHOLD,
  withCrisisCard,
} from '../crisis'
import { CRISIS_LINES, linesFor } from '../crisisLines'

describe('matchesCrisisPhrase', () => {
  it.each([
    '요즘 죽고 싶다는 생각이 들어',
    '죽고싶어',
    '그냥 사라지고 싶어',
    '살고 싶지 않아',
    '자해를 했어',
    '극단적 선택을 생각했어',
    'I want to die',
    'I keep thinking about suicide',
    'I might hurt myself',
  ])('matches "%s"', (text) => {
    expect(matchesCrisisPhrase(text)).toBe(true)
  })

  it('ignores spacing and case', () => {
    expect(matchesCrisisPhrase('죽 고  싶 어')).toBe(true)
    expect(matchesCrisisPhrase('KILL MYSELF')).toBe(true)
  })

  it.each([
    '오늘 회의가 길어서 지쳤어',
    '배고파 죽겠어',
    '죽을 만큼 웃었어',
    '드라마 보다가 울었어',
  ])('leaves an everyday sentence alone: "%s"', (text) => {
    expect(matchesCrisisPhrase(text)).toBe(false)
  })
})

describe('decideCrisis', () => {
  it('is a crisis when either signal says so', () => {
    expect(decideCrisis({ phrase: true, moderation: false })).toBe(true)
    expect(decideCrisis({ phrase: false, moderation: true })).toBe(true)
    expect(decideCrisis({ phrase: false, moderation: false })).toBe(false)
  })

  it('never lets an unavailable moderation result clear a phrase match', () => {
    expect(decideCrisis({ phrase: true, moderation: null })).toBe(true)
    expect(decideCrisis({ phrase: false, moderation: null })).toBe(false)
  })
})

function fakeModeration(categories: Record<string, boolean>, scores: Record<string, number>) {
  const create = vi.fn(async () => ({
    results: [{ categories, category_scores: scores }],
  }))
  return { client: { moderations: { create } } as unknown as OpenAI, create }
}

describe('moderationSignal', () => {
  it('is true when a self-harm category is flagged', async () => {
    const { client } = fakeModeration({ 'self-harm/intent': true }, {})
    expect(await moderationSignal('...', client)).toBe(true)
  })

  it('is true at the threshold even when nothing is flagged (when unsure, show the card)', async () => {
    const { client } = fakeModeration({}, { 'self-harm': MODERATION_THRESHOLD })
    expect(await moderationSignal('...', client)).toBe(true)
  })

  it('is false below the threshold, and ignores other categories', async () => {
    const { client } = fakeModeration(
      { violence: true },
      { 'self-harm': MODERATION_THRESHOLD - 0.01, violence: 0.9 }
    )
    expect(await moderationSignal('...', client)).toBe(false)
  })

  it('is null when the endpoint fails, so the word list decides alone', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = {
      moderations: { create: vi.fn(async () => Promise.reject(new Error('timeout'))) },
    } as unknown as OpenAI
    expect(await moderationSignal('...', client)).toBe(null)
  })
})

describe('countryFor', () => {
  it('takes the locale region first, then the zone, else unknown', () => {
    expect(countryFor({ locale: 'en-US', timezone: 'Asia/Seoul' })).toBe('US')
    expect(countryFor({ locale: 'ko', timezone: 'Asia/Seoul' })).toBe('KR')
    expect(countryFor({ locale: 'ko', timezone: 'Europe/Berlin' })).toBe(null)
    expect(countryFor({ locale: 'not a locale!', timezone: 'Asia/Seoul' })).toBe('KR')
  })
})

describe('crisis lines', () => {
  it('has Korea’s two 24-hour lines and nothing for an unknown country', () => {
    expect(CRISIS_LINES.KR.lines.map((l) => l.tel)).toEqual(['109', '1577-0199'])
    expect(linesFor('KR')).toBe(CRISIS_LINES.KR)
    expect(linesFor('US')).toBe(null)
    expect(linesFor(null)).toBe(null)
  })
})

async function collect(parts: AsyncIterable<StreamPart>) {
  const out: StreamPart[] = []
  for await (const part of parts) out.push(part)
  return out
}
async function* from(...parts: StreamPart[]) {
  yield* parts
}

describe('withCrisisCard', () => {
  const card = (country: string | null) =>
    ({ type: 'tool-result', tool: 'crisis', data: { country } }) as const

  it('sends the card first, then the reply', async () => {
    const out = await collect(
      withCrisisCard(
        from({ type: 'text-delta', delta: '들려줘서 고마워요' }, { type: 'done' }),
        'KR',
        'fallback'
      )
    )
    expect(out).toEqual([
      card('KR'),
      { type: 'text-delta', delta: '들려줘서 고마워요' },
      { type: 'done' },
    ])
  })

  it('says the fixed words instead of an error when the reply fails before any text', async () => {
    const out = await collect(
      withCrisisCard(from({ type: 'error', message: 'x' }), null, 'fallback')
    )
    expect(out).toEqual([card(null), { type: 'text-delta', delta: 'fallback' }, { type: 'done' }])
  })

  it('keeps what was said when the reply fails midway, without an error', async () => {
    const out = await collect(
      withCrisisCard(
        from({ type: 'text-delta', delta: '고마워요' }, { type: 'error', message: 'x' }),
        'KR',
        'fallback'
      )
    )
    expect(out).toEqual([card('KR'), { type: 'text-delta', delta: '고마워요' }, { type: 'done' }])
  })

  it('answers with the fixed words when there is no reply at all (the daily limit)', async () => {
    const out = await collect(withCrisisCard(from(), 'KR', 'fallback'))
    expect(out).toEqual([card('KR'), { type: 'text-delta', delta: 'fallback' }, { type: 'done' }])
  })
})
