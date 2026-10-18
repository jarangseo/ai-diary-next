// Drafts a chat entry's 일기 from its conversation (#75) — the moment the product exists
// for. Decided rules (PRODUCT_DIRECTION, *How the AI drafts*): first person; the user's
// own words wherever possible; nothing the user did not say; length in proportion to
// what was said; in the language the user wrote in.
//
// Same shape as emotionAnalysis: structured output, a defensive pure parser, never throws
// (null means "could not draft"), and an injectable client so it is tested without a key.
import OpenAI from 'openai'
import type { Message } from '@/types/thread'

const MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 20_000
const MAX_RETRIES = 2
// The conversation sent to the model, newest kept. Far past any one evening's talk.
const MAX_INPUT_CHARS = 12_000
const MAX_TITLE_CHARS = 60

export interface DiaryDraft {
  title: string
  text: string
}

const SYSTEM_PROMPT = [
  'You turn a conversation between a person and their diary companion into that person’s diary entry for the day.',
  'Write in the first person, as the person.',
  'Use the person’s own words and phrasing wherever possible; rephrase only to join their sentences.',
  'Include nothing the person did not say: no feelings, events, lessons or encouragement they did not express. Ignore what the companion said except as context for the person’s answers.',
  'Keep the length in proportion to what they said: a few short messages make a few sentences.',
  'Write in the same language the person wrote in.',
  'Also give a short title (a few words) in that language, taken from their own words.',
].join(' ')

const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'diary_draft',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { title: { type: 'string' }, diary: { type: 'string' } },
      required: ['title', 'diary'],
    },
  },
}

/** The conversation as the model reads it, newest kept when it is too long. */
export function conversationForDraft(messages: Pick<Message, 'role' | 'content'>[]): string {
  const lines = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
    .map((m) => `${m.role === 'user' ? 'Person' : 'Companion'}: ${m.content.trim()}`)
  let text = lines.join('\n')
  while (text.length > MAX_INPUT_CHARS && lines.length > 1) {
    lines.shift()
    text = lines.join('\n')
  }
  return text.slice(-MAX_INPUT_CHARS)
}

/** Pure validator for the model's JSON. Null when unusable. */
export function parseDraftResponse(raw: string | null | undefined): DiaryDraft | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { title, diary } = data as Record<string, unknown>
  if (typeof diary !== 'string' || !diary.trim()) return null
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, MAX_TITLE_CHARS) : ''
  return { title: cleanTitle, text: diary.trim() }
}

/**
 * The deterministic draft used where no model may be called (E2E, bench): the person's
 * own messages joined, which is also what a perfect draft of a very short talk looks like.
 */
export function fakeDraft(messages: Pick<Message, 'role' | 'content'>[]): DiaryDraft | null {
  const said = messages
    .filter((m) => m.role === 'user' && m.content.trim())
    .map((m) => m.content.trim())
  if (said.length === 0) return null
  return { title: said[0].slice(0, 30), text: said.join(' ') }
}

export async function draftDiary(
  messages: Pick<Message, 'role' | 'content'>[],
  options: { client?: OpenAI } = {}
): Promise<DiaryDraft | null> {
  if (!messages.some((m) => m.role === 'user' && m.content.trim())) return null

  try {
    // Constructed inside the try: `new OpenAI()` throws synchronously without a key.
    const openai =
      options.client ??
      new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: REQUEST_TIMEOUT_MS,
        maxRetries: MAX_RETRIES,
      })
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: conversationForDraft(messages) },
      ],
    })
    return parseDraftResponse(response.choices[0]?.message?.content)
  } catch (error) {
    console.error('draftDiary failed:', error instanceof Error ? error.message : error)
    return null
  }
}
