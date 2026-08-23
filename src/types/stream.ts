import type { MessageToolResult } from './thread'

// Wire protocol between the streaming endpoint and the client transport.
//
// NDJSON: one JSON-encoded `StreamPart` per line. Chosen over SSE because the only
// thing SSE adds here is a framing convention we would still have to parse, plus
// reconnect semantics that are wrong for this case — a half-finished assistant
// message must not silently resume, it has to be regenerated.
//
// `tool-result` is a first-class part rather than text so the client can render a
// component at that point in the stream instead of parsing text back into data.
export type StreamPart =
  | { type: 'text-delta'; delta: string }
  | ({ type: 'tool-result' } & MessageToolResult)
  | { type: 'done' }
  | { type: 'error'; message: string }
