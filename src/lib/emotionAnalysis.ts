// AI emotion analysis engine. Given diary text, returns a DiaryEmotion or null.
//
// Design goals (Stage 2):
// - Constrain the model to the fixed 7-emotion taxonomy via structured output (json_schema).
// - Be defensive: validate/clamp the response (`parseEmotionResponse`) instead of trusting it.
// - Never throw — analysis is best-effort; on any failure we return null so the caller can
//   still save the diary without emotion (graceful fallback, wired in Stage 3).
import OpenAI from 'openai'
import { EMOTIONS, isEmotionPrimary } from './emotion'
import type { DiaryEmotion } from '@/types/diary'

// Cap input so a very long entry can't blow up tokens/latency/cost.
const MAX_INPUT_CHARS = 4000
const MAX_QUESTIONS = 3
const REQUEST_TIMEOUT_MS = 12_000
const MAX_RETRIES = 2
const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = [
  '너는 한국어 일기의 감정을 분석하는 도우미야.',
  '주어진 일기를 읽고 그날의 가장 핵심적인 감정 하나(primary)를 정해진 목록에서 고른다.',
  'score는 그 감정의 강도를 0~100 정수로 나타낸다(0=거의 없음, 100=매우 강함).',
  'summary는 감정의 흐름을 1~2문장의 따뜻한 한국어로 요약한다.',
  'questions는 글쓴이가 그날을 더 돌아보게 돕는 한국어 회고 질문 2~3개다.',
  '모든 출력은 한국어로 작성한다.',
].join(' ')

// JSON schema for OpenAI structured outputs. `enum` + `strict` force `primary` into the
// taxonomy. Note: structured-output strict mode does NOT support minimum/maximum/minItems —
// score range and question count are enforced in parseEmotionResponse, not here.
const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'emotion_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        primary: { type: 'string', enum: [...EMOTIONS] },
        score: { type: 'integer' },
        summary: { type: 'string' },
        questions: { type: 'array', items: { type: 'string' } },
      },
      required: ['primary', 'score', 'summary', 'questions'],
    },
  },
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

// Pure, side-effect-free validator for the model's raw JSON string. Returns a normalized
// DiaryEmotion, or null when the payload is unusable (malformed JSON, unknown emotion).
export function parseEmotionResponse(raw: string | null | undefined): DiaryEmotion | null {
  if (!raw) return null

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof data !== 'object' || data === null) return null
  const obj = data as Record<string, unknown>

  // primary must be a known taxonomy key; otherwise the result is meaningless.
  if (!isEmotionPrimary(obj.primary)) return null

  const questions = Array.isArray(obj.questions)
    ? obj.questions
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .map((q) => q.trim())
        .slice(0, MAX_QUESTIONS)
    : []

  return {
    primary: obj.primary,
    score: clampScore(obj.score),
    summary: typeof obj.summary === 'string' ? obj.summary.trim() : '',
    questions,
  }
}

// Analyze a diary entry's emotion. Best-effort: returns null on empty input or any failure.
// `client` is injectable so tests can run without network/env.
export async function analyzeEmotion(
  content: string,
  client?: OpenAI
): Promise<DiaryEmotion | null> {
  const text = content?.trim().slice(0, MAX_INPUT_CHARS)
  if (!text) return null

  const openai =
    client ??
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    })

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `다음 일기의 감정을 분석해줘:\n\n${text}` },
      ],
      response_format: RESPONSE_FORMAT,
      max_tokens: 400,
    })

    return parseEmotionResponse(response.choices[0]?.message?.content)
  } catch (error) {
    // Swallow and fall back — the diary must still be saveable without emotion.
    console.error('Emotion analysis failed:', error)
    return null
  }
}
