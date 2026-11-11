import type { CrisisToolResult, EmotionToolResult, SourcesToolResult } from './thread'

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
  // The emotion card, the crisis card and the source chips stream. A wrap-up offer is
  // decided by the server after the reply and stored as a message of its own (#74).
  | ({ type: 'tool-result' } & (EmotionToolResult | CrisisToolResult | SourcesToolResult))
  | { type: 'done' }
  | { type: 'error'; message: string }
