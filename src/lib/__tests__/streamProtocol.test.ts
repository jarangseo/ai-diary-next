import { describe, it, expect } from 'vitest'
import { encodePart, createPartParser } from '../streamProtocol'
import type { StreamPart } from '@/types/stream'

const parts: StreamPart[] = [
  { type: 'text-delta', delta: '오늘 ' },
  { type: 'text-delta', delta: '하루는 ' },
  { type: 'tool-result', tool: 'emotion', data: { primary: 'calm', score: 62, summary: '차분한 하루' } },
  { type: 'done' },
]

describe('streamProtocol', () => {
  it('round-trips parts through encode and parse', () => {
    const parser = createPartParser()
    const wire = parts.map(encodePart).join('')
    expect([...parser.push(wire), ...parser.flush()]).toEqual(parts)
  })

  it('emits nothing until a line is terminated', () => {
    const parser = createPartParser()
    expect(parser.push('{"type":"text-delta","delta":"안')).toEqual([])
    expect(parser.push('녕"}\n')).toEqual([{ type: 'text-delta', delta: '안녕' }])
  })

  it('reassembles parts split across arbitrary chunk boundaries', () => {
    const wire = parts.map(encodePart).join('')
    const parser = createPartParser()
    const out: StreamPart[] = []
    // Byte-at-a-time is the worst case a real body can produce.
    for (const ch of wire) out.push(...parser.push(ch))
    out.push(...parser.flush())
    expect(out).toEqual(parts)
  })

  it('handles several parts arriving in one chunk', () => {
    const parser = createPartParser()
    expect(parser.push(parts.slice(0, 2).map(encodePart).join(''))).toEqual(parts.slice(0, 2))
  })

  it('surfaces a malformed line as an error part instead of dropping it', () => {
    const parser = createPartParser()
    const [part] = parser.push('{not json}\n')
    expect(part.type).toBe('error')
  })

  it('ignores blank lines', () => {
    const parser = createPartParser()
    expect(parser.push('\n\n')).toEqual([])
    expect(parser.flush()).toEqual([])
  })
})
