import { describe, it, expect } from 'vitest'
import { partsToNdjsonStream } from '../streamResponse'
import { createPartParser } from '../streamProtocol'
import type { StreamPart } from '@/types/stream'
import type { MessageToolResult } from '@/types/thread'

async function* from(parts: StreamPart[], throwAt?: number): AsyncGenerator<StreamPart> {
  for (const [i, p] of parts.entries()) {
    if (i === throwAt) throw new Error('source exploded')
    yield p
  }
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<StreamPart[]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const parser = createPartParser()
  const out: StreamPart[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out.push(...parser.push(decoder.decode(value, { stream: true })))
  }
  return [...out, ...parser.flush()]
}

const emotion: MessageToolResult = {
  tool: 'emotion',
  data: { primary: 'calm', score: 50, summary: '차분한 하루' },
}

describe('partsToNdjsonStream', () => {
  it('accumulates text and tool results for the caller to persist', async () => {
    let seen: { text: string; toolResults: MessageToolResult[] } | null = null

    const stream = partsToNdjsonStream(
      from([
        { type: 'text-delta', delta: '오늘 ' },
        { type: 'tool-result', ...emotion },
        { type: 'text-delta', delta: '하루는 괜찮았어요.' },
        { type: 'done' },
      ]),
      { onComplete: (text, toolResults) => void (seen = { text, toolResults }) }
    )

    await drain(stream)
    expect(seen).toEqual({ text: '오늘 하루는 괜찮았어요.', toolResults: [emotion] })
  })

  it('passes every part through unchanged', async () => {
    const parts: StreamPart[] = [{ type: 'text-delta', delta: 'a' }, { type: 'done' }]
    expect(await drain(partsToNdjsonStream(from(parts)))).toEqual(parts)
  })

  it('reports what was produced before a failure, and emits an error part', async () => {
    let seen = ''
    const stream = partsToNdjsonStream(
      // Throws on the second pull, after the first delta has already reached the client.
      from([{ type: 'text-delta', delta: '앞부분' }, { type: 'done' }], 1),
      {
        onComplete: (text) => void (seen = text),
      }
    )

    const parts = await drain(stream)
    expect(parts.at(-1)).toEqual({ type: 'error', message: 'source exploded' })
    // The user saw "앞부분", so that is what gets stored — a reload must not disagree.
    expect(seen).toBe('앞부분')
  })

  it('still completes when the consumer cancels mid-stream', async () => {
    let called = false
    const stream = partsToNdjsonStream(
      from([
        { type: 'text-delta', delta: '하나' },
        { type: 'text-delta', delta: '둘' },
        { type: 'done' },
      ]),
      { onComplete: () => void (called = true) }
    )

    const reader = stream.getReader()
    await reader.read()
    await reader.cancel()

    // Give the queued microtasks a turn to run the finally block.
    await new Promise((r) => setTimeout(r, 0))
    expect(called).toBe(true)
  })
})
