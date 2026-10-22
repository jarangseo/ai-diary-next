import OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import type { SourceEntry } from '@/types/thread'
import type { MemorySource } from './memory'

// Source chips (#76): the entries a reply drew on, shown under it as `M월 D일 일기`, at most
// three. Which ones is asked of the model after the reply, in a small separate call
// (decided: A): the reply model is streaming prose and cannot be trusted to also keep a
// clean list, and guessing from dates in the text misses "그때도 지쳤다고 했었죠".
//
// Cost: one short gpt-4o-mini call per reply, and only when there was memory to draw on.

export const MAX_SOURCES = 3
const MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 8_000
const SNIPPET_CHARS = 120

const PROMPT = `아래는 사용자가 쓴 지난 일기 목록과, 방금 AI가 사용자에게 한 답장이야.
답장이 실제로 언급하거나 떠올린 일기의 번호만 골라. 지금 대화 이야기만 하거나 일반적인 공감만 했다면 아무것도 고르지 마.
최대 ${MAX_SOURCES}개, JSON으로만 답해: {"cited": ["E1"]}`

/** The candidates as numbered lines: the model answers with these keys, not with ids. */
export function candidateList(candidates: MemorySource[]): string {
  return candidates
    .map((c, i) => {
      const text = c.text.replace(/\s+/g, ' ').trim().slice(0, SNIPPET_CHARS)
      return `E${i + 1}: ${c.date}${c.title ? ` "${c.title}"` : ''} — ${text}`
    })
    .join('\n')
}

/**
 * The model's answer as entries: known keys only, each once, in the model's order, at
 * most MAX_SOURCES. Anything malformed is no sources rather than a broken reply.
 */
export function parseCited(raw: string, candidates: MemorySource[]): SourceEntry[] {
  let keys: unknown
  try {
    keys = (JSON.parse(raw) as { cited?: unknown }).cited
  } catch {
    return []
  }
  if (!Array.isArray(keys)) return []
  const seen = new Set<string>()
  const out: SourceEntry[] = []
  for (const key of keys) {
    const match = typeof key === 'string' ? /^E(\d+)$/.exec(key.trim()) : null
    const candidate = match ? candidates[Number(match[1]) - 1] : undefined
    if (!candidate || seen.has(candidate.id)) continue
    seen.add(candidate.id)
    out.push({ id: candidate.id, date: candidate.date })
    if (out.length === MAX_SOURCES) break
  }
  return out
}

/** Which candidates the reply drew on; none when it could not be asked. */
export async function citedSources(
  reply: string,
  candidates: MemorySource[],
  { client, signal }: { client?: OpenAI; signal?: AbortSignal } = {}
): Promise<SourceEntry[]> {
  if (!reply.trim() || candidates.length === 0) return []
  try {
    const openai = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: TIMEOUT_MS })
    const res = await openai.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 40,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          {
            role: 'user',
            content: `<지난 일기>\n${candidateList(candidates)}\n</지난 일기>\n\n<답장>\n${reply}\n</답장>`,
          },
        ],
      },
      { signal }
    )
    return parseCited(res.choices[0]?.message?.content ?? '', candidates)
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      console.error('citedSources failed:', error)
    }
    return []
  }
}

/**
 * The stand-in for `citedSources` in test runs, where the reply is the fake stream: the
 * newest entry memory held, so a test can see a chip appear and open it.
 */
export function fakeCited(candidates: MemorySource[]): SourceEntry[] {
  return candidates.slice(0, 1).map(({ id, date }) => ({ id, date }))
}

/**
 * The reply, then its source chips before it ends. A reply that was stopped, failed, or
 * drew on nothing gets none. `cite` is `citedSources` in production and a stand-in in
 * test runs.
 */
export async function* withSources(
  source: AsyncIterable<StreamPart>,
  cite: (reply: string) => Promise<SourceEntry[]>,
  signal?: AbortSignal
): AsyncGenerator<StreamPart> {
  let reply = ''
  for await (const part of source) {
    if (part.type === 'error') {
      yield part
      return
    }
    if (part.type === 'done') break
    if (part.type === 'text-delta') reply += part.delta
    yield part
  }
  if (reply.trim() && !signal?.aborted) {
    const entries = await cite(reply)
    if (entries.length) yield { type: 'tool-result', tool: 'sources', data: { entries } }
  }
  yield { type: 'done' }
}
