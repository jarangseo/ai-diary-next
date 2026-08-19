import type { StreamPart } from '@/types/stream'
import { partsToNdjsonStream } from './streamResponse'

// A deterministic stand-in for the model's stream.
//
// It exists for three reasons, and the third is the one that shaped it:
//  1. the thread UI can be built and demoed with no API key and no network
//  2. it is the fixture the transport tests run against
//  3. **it is the performance benchmark.** A live model varies in length and pace,
//     so before/after numbers taken against one are noise. Every number in
//     docs/PERFORMANCE.md is measured against this, at fixed length and fixed pace.
//
// Nothing here may use Math.random or the clock to decide *content* — two runs must
// produce byte-identical output or the benchmark means nothing.

export const BENCH = {
  /** text-delta parts emitted, excluding tool results and the terminator. */
  textDeltas: 800,
  /** delay between parts, ms. */
  intervalMs: 20,
  /** indices (in text-delta count) after which a tool result is injected. */
  toolResultAfter: [280, 560],
} as const

// Cycled to build the body. Kept short and fixed — the exact words are irrelevant,
// their count and width are not.
const PHRASES = [
  '오늘 ', '하루를 ', '읽어보니 ', '회의가 ', '길었던 ', '것에 ', '대한 ', '피로가 ',
  '먼저 ', '보여요. ', '그런데 ', '그 ', '뒤에 ', '적어둔 ', '문장에서는 ', '조금 ',
  '다른 ', '결이 ', '느껴집니다. ', '스스로 ', '정리한 ', '부분을 ', '다시 ', '언급했고, ',
  '그때 ', '표현이 ', '한결 ', '차분해졌어요. ', '지난 ', '주에 ', '쓴 ', '기록과 ',
  '비교하면 ', '같은 ', '상황을 ', '설명하는 ', '방식이 ', '달라진 ', '지점이 ', '있습니다. ',
]

const EMOTION_RESULTS: StreamPart[] = [
  {
    type: 'tool-result',
    tool: 'emotion',
    data: {
      primary: 'tired',
      score: 68,
      summary: '긴 회의로 소진된 하루, 그래도 마무리는 스스로 정리했어요.',
      questions: ['그 회의에서 제일 답답했던 건 뭐였어?', '내일은 뭘 하나만 덜어낼 수 있을까?'],
    },
  },
  {
    type: 'tool-result',
    tool: 'emotion',
    data: {
      primary: 'calm',
      score: 54,
      summary: '후반부로 갈수록 표현이 차분해졌습니다.',
      questions: ['오늘 하루 중 가장 조용했던 순간은 언제였어?'],
    },
  },
]

/** The full part sequence, identical on every call. */
export function benchmarkParts(): StreamPart[] {
  const parts: StreamPart[] = []
  let toolIndex = 0

  for (let i = 0; i < BENCH.textDeltas; i++) {
    parts.push({ type: 'text-delta', delta: PHRASES[i % PHRASES.length] })
    if (
      toolIndex < BENCH.toolResultAfter.length &&
      i + 1 === BENCH.toolResultAfter[toolIndex]
    ) {
      parts.push(EMOTION_RESULTS[toolIndex % EMOTION_RESULTS.length])
      toolIndex++
    }
  }

  parts.push({ type: 'done' })
  return parts
}

export interface FakeStreamOptions {
  /** Override the pace. 0 emits everything immediately — used by tests. */
  intervalMs?: number
  signal?: AbortSignal
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The part sequence, paced like a real stream.
 *
 * Aborting stops mid-sequence on purpose: the assistant message stays partial, which
 * is exactly the state the UI has to handle after the user hits stop.
 */
export async function* fakeParts(options: FakeStreamOptions = {}): AsyncGenerator<StreamPart> {
  const { intervalMs = BENCH.intervalMs, signal } = options

  for (const part of benchmarkParts()) {
    if (signal?.aborted) return
    yield part
    if (intervalMs > 0) await sleep(intervalMs)
  }
}

/** The same sequence as an NDJSON body. */
export function fakeStreamResponse(options: FakeStreamOptions = {}): ReadableStream<Uint8Array> {
  return partsToNdjsonStream(fakeParts(options))
}
