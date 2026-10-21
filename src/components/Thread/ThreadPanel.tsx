'use client'
import { useEffect, useRef, useState } from 'react'
import { useThreadStream } from '@/hooks/useThreadStream'
import { getEmotionMeta } from '@/lib/emotion'
import type { EmotionToolResult, Message } from '@/types/thread'
import { CrisisCard } from '@/components/Crisis/CrisisCard'
import { isWrapUpOffer } from '@/lib/wrapUp'
import styles from './ThreadPanel.module.scss'

interface Props {
  threadId: string
  initialMessages: Message[]
  /** Deterministic stream instead of the model — set by the page in test runs. */
  bench?: boolean
}

// The generative-UI half: a tool result becomes a component, not text. Because the
// stream carries it as a typed part, this reads `data` directly instead of parsing a
// model's prose back into structure.
function EmotionCard({ message }: { message: Message }) {
  const result = message.toolResults?.find((r): r is EmotionToolResult => r.tool === 'emotion')
  if (!result) return null

  const meta = getEmotionMeta(result.data.primary)

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>
        {meta?.emoji} {meta?.label} · {result.data.score}
      </div>
      <div>{result.data.summary}</div>
      {result.data.questions?.length ? (
        <ul className={styles.cardQuestions}>
          {result.data.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// How close to the bottom still counts as "following". Not zero: sub-pixel rounding and
// the growing last line mean an exact match never holds while text streams in.
const PIN_THRESHOLD_PX = 40

export function ThreadPanel({ threadId, initialMessages, bench }: Props) {
  const { messages, status, send, stop } = useThreadStream({ threadId, initialMessages, bench })
  const [text, setText] = useState('')

  const listRef = useRef<HTMLDivElement>(null)
  // Whether the view follows new content. State rather than a ref because it also drives
  // the jump-to-bottom button.
  const [pinned, setPinned] = useState(true)

  // Reading the distance instead of remembering "we scrolled it ourselves" is what makes
  // this safe: a programmatic scroll to the bottom lands at distance ~0, so it re-reports
  // pinned and nothing has to distinguish our scrolls from the user's.
  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX)
  }

  // Runs per token while streaming. `pinned` is a dependency on purpose — scrolling back
  // down should resume following immediately, not on the next token.
  useEffect(() => {
    const el = listRef.current
    if (!el || !pinned) return
    el.scrollTop = el.scrollHeight
  }, [messages, pinned])

  const streaming = status === 'streaming'

  const submit = () => {
    // Cleared optimistically so the composer feels instant. A message whose reply fails
    // stays in the thread, so what the user wrote is never lost.
    send(text)
    setText('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list} ref={listRef} onScroll={handleScroll}>
        {/* Wrap-up offers belong to chat entries, which the 대화 중 screen (ChatEntry) draws.
            This panel serves written entries, so an offer is never drawn as an empty bubble. */}
        {messages
          .filter((m) => !isWrapUpOffer(m))
          .map((m) => (
            <div
              key={m.id}
              className={`${styles.message} ${m.role === 'user' ? styles.user : styles.assistant}`}
            >
              {m.content}
              <EmotionCard message={m} />
              {m.toolResults?.map(
                (r) => r.tool === 'crisis' && <CrisisCard key="crisis" country={r.data.country} />
              )}
            </div>
          ))}
      </div>

      {!pinned && (
        <button
          className={styles.jump}
          type="button"
          onClick={() => setPinned(true)}
          aria-label="최신 메시지로 이동"
        >
          ↓ 최신 메시지
        </button>
      )}

      {status === 'error' && (
        <div className={styles.error}>전송에 실패했어요. 다시 시도해 주세요.</div>
      )}

      <div className={styles.composer}>
        <input
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
          placeholder="이 일기에 대해 이야기해 보세요"
          aria-label="메시지 입력"
        />
        {streaming ? (
          <button className={styles.button} onClick={stop} type="button">
            정지
          </button>
        ) : (
          <button className={styles.button} onClick={submit} type="button" disabled={!text.trim()}>
            보내기
          </button>
        )}
      </div>
    </div>
  )
}
