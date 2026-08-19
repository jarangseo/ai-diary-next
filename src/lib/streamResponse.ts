import type { StreamPart } from '@/types/stream'
import type { MessageToolResult } from '@/types/thread'
import { encodePart } from './streamProtocol'

export interface StreamResponseOptions {
  /**
   * Called once the source is exhausted, aborted, or has thrown, with whatever was
   * produced. It runs on abort too: the user saw those tokens, so a reload showing
   * something different would be a lie. A partial assistant message is persisted as-is.
   */
  onComplete?: (text: string, toolResults: MessageToolResult[]) => Promise<void> | void
}

/**
 * Turns a sequence of parts into the NDJSON body, accumulating as it goes so the
 * finished message can be stored without the caller re-reading its own stream.
 *
 * Both the fake source and the model source go through here, which is what keeps them
 * interchangeable — the client cannot tell which one it is talking to.
 */
export function partsToNdjsonStream(
  source: AsyncIterable<StreamPart>,
  options: StreamResponseOptions = {}
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let text = ''
  const toolResults: MessageToolResult[] = []
  let cancelled = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of source) {
          if (cancelled) break

          if (part.type === 'text-delta') text += part.delta
          else if (part.type === 'tool-result') toolResults.push({ tool: part.tool, data: part.data })

          controller.enqueue(encoder.encode(encodePart(part)))
        }
      } catch (error) {
        // Surfaced in-band rather than as a torn connection: the client already knows
        // how to render an error part, and a silent cut looks identical to success.
        const message = error instanceof Error ? error.message : 'stream failed'
        try {
          controller.enqueue(encoder.encode(encodePart({ type: 'error', message })))
        } catch {
          // the consumer is gone
        }
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
        await options.onComplete?.(text, toolResults)
      }
    },
    cancel() {
      cancelled = true
    },
  })
}
