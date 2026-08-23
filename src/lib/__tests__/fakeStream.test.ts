import { describe, it, expect } from 'vitest'
import { BENCH, benchmarkParts, fakeStreamResponse } from '../fakeStream'
import { createPartParser } from '../streamProtocol'
import type { StreamPart } from '@/types/stream'

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
  out.push(...parser.flush())
  return out
}

describe('fakeStream', () => {
  // The benchmark is only meaningful if it is byte-identical run to run.
  it('produces identical output on every call', () => {
    expect(benchmarkParts()).toEqual(benchmarkParts())
  })

  it('emits the configured number of text deltas', () => {
    const deltas = benchmarkParts().filter((p) => p.type === 'text-delta')
    expect(deltas).toHaveLength(BENCH.textDeltas)
  })

  it('injects the tool results at the configured positions', () => {
    const parts = benchmarkParts()
    const toolPositions = parts
      .map((p, i) => (p.type === 'tool-result' ? i : -1))
      .filter((i) => i >= 0)

    expect(toolPositions).toHaveLength(BENCH.toolResultAfter.length)
    // A tool result lands directly after the Nth text delta, so its index is N plus
    // however many tool results were already emitted before it.
    toolPositions.forEach((position, order) => {
      expect(position).toBe(BENCH.toolResultAfter[order] + order)
    })
  })

  it('terminates with a done part', () => {
    const parts = benchmarkParts()
    expect(parts.at(-1)).toEqual({ type: 'done' })
    expect(parts.filter((p) => p.type === 'done')).toHaveLength(1)
  })

  it('streams the same sequence over the wire', async () => {
    expect(await drain(fakeStreamResponse({ intervalMs: 0 }))).toEqual(benchmarkParts())
  })

  it('stops early when aborted, leaving the message partial', async () => {
    const controller = new AbortController()
    const stream = fakeStreamResponse({ intervalMs: 1, signal: controller.signal })
    const reader = stream.getReader()

    await reader.read()
    controller.abort()

    // Drain whatever was already enqueued; the point is that it ends without `done`.
    const seen: string[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      seen.push(new TextDecoder().decode(value))
    }
    expect(seen.join('')).not.toContain('"done"')
  })

  it('emits nothing when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await drain(fakeStreamResponse({ signal: controller.signal }))).toEqual([])
  })
})
