'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPartParser } from '@/lib/streamProtocol'
import type { Message, MessageToolResult } from '@/types/thread'

export type ThreadStatus = 'idle' | 'streaming' | 'error'

/**
 * Why a message of the user's has no reply: `failed` — the request or the reply broke;
 * `unsent` — the device was offline, so it never left. Either way the message stays on
 * screen (spec 1-1, 5-2) and is sent again only when the user asks.
 */
export type Delivery = 'failed' | 'unsent'

interface Options {
  threadId: string
  initialMessages: Message[]
  /** Measurement and test path: the deterministic fake stream instead of the model. */
  bench?: boolean
  /**
   * Whether the server will store a wrap-up offer after this reply — the same pure rule
   * it applies (`shouldOfferWrapUp`), given the conversation so far. The offer is stored,
   * not streamed, so the client adds its own copy to show it without a reload.
   */
  offersWrapUp?: (messages: Message[]) => boolean
}

// Consumes the NDJSON stream from POST /api/threads/:id/messages and keeps the
// conversation in React state.
//
// ⚠️ The update strategy here is deliberately the naive one — a single messages array,
// rebuilt on every token. It is what most code does, it is what the baseline in
// docs/PERFORMANCE.md measures, and it is the thing the INP work then fixes. Do not
// "improve" it before the baseline is recorded.
export function useThreadStream({
  threadId,
  initialMessages,
  bench = false,
  offersWrapUp,
}: Options) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [status, setStatus] = useState<ThreadStatus>('idle')
  const [delivery, setDelivery] = useState<Record<string, Delivery>>({})
  // The server refused for the daily limit (429).
  const [limited, setLimited] = useState(false)

  // A ref, not state: nothing renders differently because the controller changed, and
  // putting it in state would re-render the whole thread on every send.
  const abortRef = useRef<AbortController | null>(null)

  // An in-flight stream outlives the component otherwise — the fetch keeps running and
  // its handlers keep writing to a component that is gone.
  useEffect(() => () => abortRef.current?.abort(), [])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const offersRef = useRef(offersWrapUp)
  useEffect(() => {
    offersRef.current = offersWrapUp
  })

  // Mirrors the route: once a reply with any text is stored, so is the offer, if due.
  const addOfferAfter = useCallback(
    (replyId: string) =>
      setMessages((prev) => {
        const reply = prev.find((m) => m.id === replyId)
        if (!reply?.content || !offersRef.current?.(prev)) return prev
        const offer: Message = {
          id: crypto.randomUUID(),
          threadId,
          role: 'assistant',
          content: '',
          toolResults: [{ tool: 'wrapup_offer' }],
          createdAt: Date.now(),
        }
        return [...prev, offer]
      }),
    [threadId]
  )

  const mark = useCallback(
    (id: string, value?: Delivery) =>
      setDelivery((prev) => {
        const next = { ...prev }
        if (value) next[id] = value
        else delete next[id]
        return next
      }),
    []
  )

  // Sends the user's message `userId` (already on screen) and streams the reply under it.
  // Resolves true once the reply has arrived.
  const deliver = useCallback(
    async (userId: string, text: string, retrying = false): Promise<boolean> => {
      mark(userId)
      if (!navigator.onLine) {
        mark(userId, 'unsent')
        return false
      }

      // A temporary id: React needs a stable key now, the server assigns the real one
      // later. Captured in closures below so updates target this exact message rather
      // than "the last one", which breaks the moment anything else appends.
      const assistantId = crypto.randomUUID()
      const placeholder: Message = {
        id: assistantId,
        threadId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      }
      setMessages((prev) => {
        if (!retrying) return [...prev, placeholder]
        // A retry replaces what the failed attempt left after the message (a reply that
        // broke off); the server drops the same (#115).
        const at = prev.findIndex((m) => m.id === userId)
        return at === -1 ? [...prev, placeholder] : [...prev.slice(0, at + 1), placeholder]
      })
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
            body: JSON.stringify(retrying ? { text, retry: true } : { text }),
            signal: controller.signal,
          }
        )

        if (response.status === 429) setLimited(true)
        // fetch resolves on 4xx/5xx, so the status has to be checked explicitly.
        if (!response.ok || !response.body) {
          throw new Error(`stream failed: ${response.status}`)
        }

        const reader = response.body.getReader()
        let failed = false

        const apply = (parts: ReturnType<typeof parser.push>) => {
          for (const part of parts) {
            if (part.type === 'text-delta') applyDelta(part.delta)
            else if (part.type === 'tool-result')
              applyToolResult({ tool: part.tool, data: part.data })
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

        // A reply that broke off keeps what arrived (the server stored the same) and
        // offers a retry under the user's message.
        if (failed) mark(userId, 'failed')
        addOfferAfter(assistantId)
        setStatus(failed ? 'error' : 'idle')
        return !failed
      } catch (error) {
        // Aborting is how stop() works, so it is a normal ending, not a failure. The
        // partial assistant message stays — the server stored the same thing.
        if (error instanceof DOMException && error.name === 'AbortError') {
          addOfferAfter(assistantId)
          setStatus('idle')
          return true
        }

        // No reply arrived: its placeholder goes, the user's message stays.
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        mark(userId, navigator.onLine ? 'failed' : 'unsent')
        setStatus('error')
        return false
      } finally {
        abortRef.current = null
      }
    },
    [threadId, bench, mark, addOfferAfter]
  )

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim()
      if (!trimmed || status === 'streaming') return false

      const userId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: userId, threadId, role: 'user', content: trimmed, createdAt: Date.now() },
      ])
      return deliver(userId, trimmed)
    },
    [threadId, status, deliver]
  )

  /**
   * Sends a failed or unsent message again, under the same bubble. Never automatic: a
   * message that did reach the server before the connection dropped would go twice.
   */
  const retry = useCallback(
    (id: string): Promise<boolean> => {
      const message = messages.find((m) => m.id === id)
      if (!message || status === 'streaming') return Promise.resolve(false)
      return deliver(id, message.content, true)
    },
    [messages, status, deliver]
  )

  return { messages, status, send, stop, retry, delivery, limited }
}
