import OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import type { Message } from '@/types/thread'
import { analyzeEmotion } from './emotionAnalysis'

const MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 30_000
const MAX_HISTORY = 20

// The assistant's job is the one the product is built around: help someone look at the
// day they just wrote down. Explicitly not a general assistant — that is the thing this
// app would lose to ChatGPT at, and the diary is the only context it has that ChatGPT
// does not.
const SYSTEM_PROMPT = `너는 사용자가 방금 쓴 일기를 함께 들여다보는 대화 상대야.
- 조언보다 질문을 앞세워. 사용자가 스스로 정리하도록 돕는 게 목적이야.
- 짧게 답해. 두세 문장이면 충분하고, 길어지면 읽히지 않아.
- 섣불리 위로하거나 판단하지 마. 사용자가 쓴 표현을 그대로 되짚어주는 게 더 도움이 돼.
- 일기와 무관한 요청에는 이 대화가 일기를 위한 자리라고 짧게 안내해.`

export interface ModelStreamOptions {
  history: Message[]
  text: string
  /** Emit the emotion card once the reply finishes. */
  withEmotion: boolean
  signal?: AbortSignal
  client?: OpenAI
}

/**
 * The model's reply as `StreamPart`s — the same shape the fake stream produces, which is
 * what lets the client stay identical for both. See docs/STREAMING_PERF.md for why the
 * fake one still exists: it is the benchmark, and a live model cannot be one.
 *
 * Failures surface as an `error` part rather than a thrown request, so the user gets a
 * message instead of a connection that stops mid-sentence for no stated reason.
 */
export async function* modelParts(options: ModelStreamOptions): AsyncGenerator<StreamPart> {
  const { history, text, withEmotion, signal, client } = options

  let full = ''

  try {
    // Constructed inside the try for the same reason as in emotionAnalysis: `new OpenAI()`
    // throws synchronously on a missing key, and that belongs in the same error path as a
    // failed request rather than crashing the route.
    const openai =
      client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS })

    const stream = await openai.chat.completions.create(
      {
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          // Bounded: an unbounded thread would grow the prompt — and the bill — without
          // limit, and the recent turns are what the reply actually depends on.
          ...history.slice(-MAX_HISTORY).map((m) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          })),
          { role: 'user', content: text },
        ],
      },
      { signal }
    )

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (!delta) continue
      full += delta
      yield { type: 'text-delta', delta }
    }
  } catch (error) {
    // Aborting is how stop() works; it is a normal ending, not a failure to report.
    if (error instanceof Error && error.name === 'AbortError') return
    const message = error instanceof Error ? error.message : 'model request failed'
    yield { type: 'error', message }
    return
  }

  // Only on the first exchange. A card after every reply would bury the conversation in
  // its own analysis — the product shows one per thread, and the seeded data models that.
  if (withEmotion && !signal?.aborted) {
    const emotion = await analyzeEmotion(text)
    if (emotion) yield { type: 'tool-result', tool: 'emotion', data: emotion }
  }

  yield { type: 'done' }
}
