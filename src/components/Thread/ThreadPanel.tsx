'use client'
import { useState } from 'react'
import { useThreadStream } from '@/hooks/useThreadStream'
import { getEmotionMeta } from '@/lib/emotion'
import type { Message } from '@/types/thread'
import styles from './ThreadPanel.module.scss'

interface Props {
  threadId: string
  initialMessages: Message[]
}

// The generative-UI half: a tool result becomes a component, not text. Because the
// stream carries it as a typed part, this reads `data` directly instead of parsing a
// model's prose back into structure.
function EmotionCard({ message }: { message: Message }) {
  const result = message.toolResults?.find((r) => r.tool === 'emotion')
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

export function ThreadPanel({ threadId, initialMessages }: Props) {
  const { messages, status, send, stop } = useThreadStream({ threadId, initialMessages })
  const [text, setText] = useState('')

  const streaming = status === 'streaming'

  const submit = async () => {
    const pending = text
    // Cleared optimistically so the composer feels instant...
    setText('')
    const ok = await send(pending)
    // ...and restored from this local copy if the request never landed, so what the
    // user wrote is never lost.
    if (!ok) setText(pending)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.message} ${m.role === 'user' ? styles.user : styles.assistant}`}
          >
            {m.content}
            <EmotionCard message={m} />
          </div>
        ))}
      </div>

      {status === 'error' && <div className={styles.error}>전송에 실패했어요. 다시 시도해 주세요.</div>}

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
