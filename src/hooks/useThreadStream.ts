'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPartParser } from '@/lib/streamProtocol'
import type { Message, MessageToolResult } from '@/types/thread'

export type ThreadStatus = 'idle' | 'streaming' | 'error'

interface Options {
  threadId: string
  initialMessages: Message[]
  /** Measurement path: the deterministic fake stream instead of the model. */
  bench?: boolean
}

// Consumes the NDJSON stream from POST /api/threads/:id/messages and keeps the
// conversation in React state.
//
// ⚠️ The update strategy here is deliberately the naive one — a single messages array,
// rebuilt on every token. It is what most code does, it is what the baseline in
// docs/PERFORMANCE.md measures, and it is the thing the INP work then fixes. Do not
// "improve" it before the baseline is recorded.
export function useThreadStream({ threadId, initialMessages, bench = true }: Options) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [status, setStatus] = useState<ThreadStatus>('idle')

  // A ref, not state: nothing renders differently because the controller changed, and
  // putting it in state would re-render the whole thread on every send.
  const abortRef = useRef<AbortController | null>(null)

  // An in-flight stream outlives the component otherwise — the fetch keeps running and
  // its handlers keep writing to a component that is gone.
  useEffect(() => () => abortRef.current?.abort(), [])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim()
      if (!trimmed || status === 'streaming') return false

      // Temporary ids: React needs a stable key now, the server assigns the real id
      // later. Captured in closures below so updates target this exact message rather
      // than "the last one", which breaks the moment anything else appends.
      const userId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()
      const now = Date.now()

      setMessages((prev) => [
        ...prev,
        { id: userId, threadId, role: 'user', content: trimmed, createdAt: now },
        { id: assistantId, threadId, role: 'assistant', content: '', createdAt: now },
      ])
      setStatus('streaming')

      const controller = new AbortController()
      abortRef.current = controller

      // Per request, not per hook: the parser buffers a partial trailing line, so a
      // shared one would leak the previous response's tail into this one.
      const parser = createPartParser()
      const decoder = new TextDecoder()

      const applyDelta = (delta: string) =>
        // ⚠️ THE line. Every token rebuilds the whole array, so all 60+ messages
        // re-render ~50 times a second. This is the baseline's INP problem.
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
        )

      const applyToolResult = (result: MessageToolResult) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, toolResults: [...(m.toolResults ?? []), result] } : m
          )
        )

      try {
        const response = await fetch(
          `/api/threads/${threadId}/messages${bench ? '?bench=1' : ''}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: trimmed }),
            signal: controller.signal,
          }
        )

        // fetch resolves on 4xx/5xx, so the status has to be checked explicitly.
        if (!response.ok || !response.body) {
          throw new Error(`stream failed: ${response.status}`)
        }

        const reader = response.body.getReader()
        let failed = false

        const apply = (parts: ReturnType<typeof parser.push>) => {
          for (const part of parts) {
            if (part.type === 'text-delta') applyDelta(part.delta)
            else if (part.type === 'tool-result') applyToolResult({ tool: part.tool, data: part.data })
            else if (part.type === 'error') failed = true
          }
        }

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          // `stream: true` keeps a multi-byte character that straddles a chunk
          // boundary intact — without it Korean text tears into replacement chars.
          apply(parser.push(decoder.decode(value, { stream: true })))
        }
        apply(parser.flush())

        setStatus(failed ? 'error' : 'idle')
        return !failed
      } catch (error) {
        // Aborting is how stop() works, so it is a normal ending, not a failure. The
        // partial assistant message stays — the server stored the same thing.
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('idle')
          return true
        }

        // Nothing reached the user, so the optimistic pair is removed. The composer
        // restores the text from its own copy, so the writing is never lost.
        setMessages((prev) => prev.filter((m) => m.id !== userId && m.id !== assistantId))
        setStatus('error')
        return false
      } finally {
        abortRef.current = null
      }
    },
    [threadId, bench, status]
  )

  return { messages, status, send, stop }
}
