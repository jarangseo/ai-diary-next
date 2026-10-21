import OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import type { UserSettings } from './settings'

// Crisis detection (#77, spec 5-2 "위기 판단"). Two signals, either one is enough:
//
// 1. A word list of explicit phrases, checked on every message. Instant, free and works
//    when the model is down or the daily limit is reached.
// 2. The model's judgement: OpenAI's moderation endpoint, whose self-harm categories are
//    built for this and cost nothing.
//
// When unsure, the card shows: a missed signal is worse than a card shown by mistake.
//
// ⚠️ Safety-critical. The phrases and the threshold are reviewed by a person before they
// ship and whenever they change. Not for an unattended loop.

/**
 * Explicit phrases, matched after lowercasing and removing whitespace, so "죽고 싶어",
 * "죽고싶어" and "죽 고 싶" all match. Korean first (the launch language); English for
 * users who write in it.
 */
export const CRISIS_PHRASES: readonly string[] = [
  // Korean
  '죽고싶',
  '죽어버리고싶',
  '죽는게나을',
  '죽어야겠',
  '살고싶지않',
  '사라지고싶',
  '자살',
  '자해',
  '극단적선택',
  '목숨을끊',
  '스스로목숨',
  '손목을긋',
  '뛰어내리고싶',
  '유서를',
  // English
  'killmyself',
  'suicide',
  'suicidal',
  'endmylife',
  'wanttodie',
  'selfharm',
  'self-harm',
  'hurtmyself',
]

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '')

export function matchesCrisisPhrase(text: string): boolean {
  const flat = normalize(text)
  return CRISIS_PHRASES.some((phrase) => flat.includes(phrase))
}

/**
 * Self-harm score at or above which the moderation result counts, even when the
 * endpoint does not flag it. Deliberately low (see "when unsure" above).
 */
export const MODERATION_THRESHOLD = 0.2

const SELF_HARM = ['self-harm', 'self-harm/intent', 'self-harm/instructions'] as const
const MODERATION_TIMEOUT_MS = 5_000

/**
 * The model's judgement. True or false from the endpoint; null when it could not be
 * asked (no key, timeout, error), which leaves the word list to decide alone.
 */
export async function moderationSignal(text: string, client?: OpenAI): Promise<boolean | null> {
  try {
    const openai =
      client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: MODERATION_TIMEOUT_MS })
    const { results } = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    })
    const result = results[0]
    if (!result) return null
    const categories = result.categories as unknown as Record<string, boolean>
    const scores = result.category_scores as unknown as Record<string, number>
    return SELF_HARM.some((key) => categories[key] || (scores[key] ?? 0) >= MODERATION_THRESHOLD)
  } catch (error) {
    console.error('Crisis moderation failed:', error)
    return null
  }
}

/** Either signal is enough; an unavailable moderation result never clears a phrase match. */
export function decideCrisis(signals: { phrase: boolean; moderation: boolean | null }): boolean {
  return signals.phrase || signals.moderation === true
}

// Zones that name a country unambiguously. Only countries with lines in crisisLines.ts
// need to be here.
const ZONE_COUNTRY: Record<string, string> = {
  'Asia/Seoul': 'KR',
}

/**
 * The user's country for crisis lines: a zone that names one first (`Asia/Seoul` → KR),
 * else the region of their locale (`en-US` → US), else unknown (null), which the card
 * answers with the international directory.
 *
 * Zone before locale: the stored locale is whatever the browser sent, and plenty of people
 * in Korea browse in `en-US`; their zone still says where they are.
 */
export function countryFor(settings: Pick<UserSettings, 'locale' | 'timezone'>): string | null {
  const byZone = ZONE_COUNTRY[settings.timezone]
  if (byZone) return byZone
  try {
    return new Intl.Locale(settings.locale).region ?? null
  } catch {
    return null // an invalid stored locale
  }
}

/**
 * The reply with the crisis card. The card goes out first: the bubble shows it under the
 * reply either way, and sent first it survives a reply the user stops or that breaks off.
 * If the reply fails before saying anything, the fixed caring words stand in for it,
 * because an error message in place of a reply is the wrong answer here.
 */
export async function* withCrisisCard(
  source: AsyncIterable<StreamPart>,
  country: string | null,
  fallbackReply: string
): AsyncGenerator<StreamPart> {
  yield { type: 'tool-result', tool: 'crisis', data: { country } }
  let said = false
  for await (const part of source) {
    if (part.type === 'done') break
    if (part.type === 'error') break
    if (part.type === 'text-delta' && part.delta) said = true
    yield part
  }
  if (!said) yield { type: 'text-delta', delta: fallbackReply }
  yield { type: 'done' }
}
