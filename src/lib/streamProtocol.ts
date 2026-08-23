import type { StreamPart } from '@/types/stream'

// Encode/decode for the NDJSON wire protocol (see types/stream.ts).
// Pure and dependency-free so it can be unit-tested without a server or a browser —
// which matters because this is the transport we hand-wrote instead of taking the
// SDK's client hook (docs/TWO_DAY_PLAN.md, "the transport decision").

export function encodePart(part: StreamPart): string {
  return `${JSON.stringify(part)}\n`
}

export interface PartParser {
  // Feed an arbitrary chunk of the response body. Network chunks split wherever they
  // like, including mid-character-sequence and mid-line, so the parser buffers the
  // trailing partial line and only emits parts it has seen terminated.
  push(chunk: string): StreamPart[]
  // Call once the body ends, to emit a final line that arrived without a newline.
  flush(): StreamPart[]
}

function parseLine(line: string): StreamPart | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as StreamPart
  } catch {
    // A malformed line is surfaced rather than dropped: silently swallowing it would
    // show the user a stream that just stops, with nothing to debug from.
    return { type: 'error', message: `malformed stream line: ${trimmed.slice(0, 80)}` }
  }
}

export function createPartParser(): PartParser {
  let buffer = ''

  return {
    push(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      // The last element is either '' (chunk ended on a newline) or a partial line.
      buffer = lines.pop() ?? ''
      return lines.map(parseLine).filter((p): p is StreamPart => p !== null)
    },
    flush() {
      const rest = buffer
      buffer = ''
      const part = parseLine(rest)
      return part ? [part] : []
    },
  }
}
