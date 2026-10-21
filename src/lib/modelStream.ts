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

// Memory (#76): how to use the user's recent entries. Remembering is the point — "화요일에도
// 회의 끝나고 지쳤다고 했었죠" — but a reply that recites the archive, or invents what is not
// in it, is worse than one that remembers nothing.
const MEMORY_PROMPT = `

아래는 사용자가 쓴 지난 일기야. [최근 2주]는 일기 요약이고, [그 이전 — 한 줄 메모]는 더 오래된
날의 한 줄 기록이야. 지금 이야기와 이어질 때만 자연스럽게 떠올려 말해
(예: "화요일에도 회의 끝나고 지쳤다고 했었죠", "지난달에도 발표 앞두고 막막하다고 했었죠").
- 한 답장에 한 번이면 충분해. 이어지지 않으면 꺼내지 마.
- 일기와 메모에 없는 내용은 절대 지어내지 마. 한 줄 메모는 짧으니 그 이상을 아는 척하지 마.
  길게 인용하지 말고 짧게 되짚어.
- 반복되는 일을 짚더라도 판단하거나 조언하지 말고, 사용자가 더 이야기하도록 물어봐.
<지난 일기>
`

// Crisis (#77, spec 5-2 "위기 응답"): once a conversation signals self-harm or suicide,
// every later reply in it follows this instead of the diary questions. The lines are on
// the card under the reply, so the model never writes numbers it could get wrong.
// ⚠️ Safety-critical copy direction: reviewed by a person before it ships.
const CRISIS_PROMPT = `

[중요] 이 대화에서 사용자가 자해나 자살을 떠올리는 신호가 있었어. 지금부터는 일기 질문을 멈춰.
- 털어놔 줘서 고맙다고, 혼자 감당하지 않았으면 한다고, 지금 상담사와 이야기할 수 있다고 따뜻하고 짧게 말해.
- 상담 전화번호는 답장 아래 카드가 안내하니 직접 쓰지 마.
- 방법이나 수단에 대한 질문에는 답하지 말고, 지금 안전한지 부드럽게 물어봐.
- 치료자인 척하지 말고, 판단하거나 설교하지 마. 사용자가 이야기를 이어가면 계속 들어줘.`

export function systemPrompt(memory?: string, crisis = false): string {
  const base = memory ? `${SYSTEM_PROMPT}${MEMORY_PROMPT}${memory}\n</지난 일기>` : SYSTEM_PROMPT
  return crisis ? `${base}${CRISIS_PROMPT}` : base
}

export interface ModelStreamOptions {
  history: Message[]
  text: string
  /** The user's recent entries, condensed (lib/memory.ts). Empty or absent: no memory. */
  memory?: string
  /** Emit the emotion card once the reply finishes. */
  withEmotion: boolean
  /** The conversation signalled a crisis (#77): reply with care, no diary questions. */
  crisis?: boolean
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
  const { history, text, memory, withEmotion, crisis, signal, client } = options

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
          { role: 'system', content: systemPrompt(memory, crisis) },
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
  if (withEmotion && !crisis && !signal?.aborted) {
    const analysis = await analyzeEmotion(text)
    if (analysis) {
      // The card shows the emotion only; the memory note belongs to the stored entry.
      const { primary, secondary, score, summary, questions } = analysis
      yield {
        type: 'tool-result',
        tool: 'emotion',
        data: { primary, secondary, score, summary, questions },
      }
    }
  }

  yield { type: 'done' }
}
