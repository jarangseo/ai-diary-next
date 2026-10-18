'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { useThreadStream } from '@/hooks/useThreadStream'
import { isWrapUpOffer } from '@/lib/wrapUp'
import type { Message } from '@/types/thread'
import { canSendMessage, remainingCount, sendsOnEnter } from '@/components/Home/composerRules'
import { takeFirstMessage } from '@/components/Home/firstMessage'
import { titleFromText } from '@/components/Shell/entryTitle'
import styles from './ChatEntry.module.scss'

interface Props {
  entryId: string
  threadId: string
  /** The AI's title, set at wrap-up. Before it, the first message's first 30 characters. */
  title?: string
  dateLabel: string
  initialMessages: Message[]
  /** Deterministic stream instead of the model — set by the page in test runs. */
  bench?: boolean
}

// A touch screen as the main pointer: Enter is a new line there and the button sends.
const TOUCH = '(pointer: coarse)'
// How close to the bottom still counts as following the conversation.
const PIN_THRESHOLD_PX = 80

/** Screen 1-1 / 1-1m: a 대화로 쓰기 entry before wrap-up. */
export function ChatEntry({ entryId, threadId, title, dateLabel, initialMessages, bench }: Props) {
  const t = useTranslations('ChatEntry')
  const tHome = useTranslations('Home.input')
  const tShell = useTranslations('Shell')
  const router = useRouter()
  const { messages, status, send, stop, retry, delivery } = useThreadStream({
    threadId,
    initialMessages,
    bench,
  })
  const [text, setText] = useState('')
  const streaming = status === 'streaming'
  const firstMessage = messages.find((m) => m.role === 'user')
  const heading =
    title || (firstMessage && titleFromText(firstMessage.content)) || tShell('untitled')

  // The home's first message waits in sessionStorage (firstMessage.ts). Taken once, on
  // mount, and only into an empty conversation. Deferred a tick so React's development
  // double mount cancels the first attempt instead of sending twice.
  useEffect(() => {
    if (initialMessages.some((m) => m.role === 'user')) return
    const timer = setTimeout(async () => {
      const first = takeFirstMessage(entryId)
      // The sidebar's title comes from the stored first message.
      if (first && (await send(first))) router.refresh()
    }, 0)
    return () => clearTimeout(timer)
    // Mount only: the hand-off must never run a second time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The page scrolls, not a panel inside it, so the conversation follows the window
  // while the reader is at the bottom and stays put once they scroll up to read.
  const pinned = useRef(true)
  useEffect(() => {
    const onScroll = () => {
      const { scrollY, innerHeight } = window
      pinned.current =
        document.documentElement.scrollHeight - scrollY - innerHeight < PIN_THRESHOLD_PX
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (pinned.current) window.scrollTo({ top: document.documentElement.scrollHeight })
  }, [messages])

  const canSend = canSendMessage(text) && !streaming
  const remaining = remainingCount(text)

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!canSend) return
    pinned.current = true
    // The message stays on screen whatever happens to it, so the input is cleared now.
    setText('')
    await send(text)
  }

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
        <p className={styles.subtitle}>
          {dateLabel} · {t('writing')}
        </p>
      </header>

      <div className={styles.log} role="log" aria-label={t('log')} aria-busy={streaming}>
        {messages
          // The wrap-up offer has no text of its own; its card arrives with #82's last part.
          .filter((m) => !isWrapUpOffer(m))
          .map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className={styles.sent}>
                <p className={styles.mine}>{m.content}</p>
                {delivery[m.id] === 'failed' && (
                  <div className={styles.failure} role="alert">
                    <span>{t('replyFailed')}</span>
                    <button
                      type="button"
                      className={styles.retry}
                      onClick={() => retry(m.id)}
                      disabled={streaming}
                    >
                      {t('retry')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className={styles.reply}>
                {m.content ? (
                  <p>{m.content}</p>
                ) : (
                  <span className={styles.typing} aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {/* Source chips (#76): the entries a reply drew on, at most three. */}
              </div>
            )
          )}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <label className={styles.visuallyHidden} htmlFor="chat-message">
          {t('input.label')}
        </label>
        <div className={styles.field}>
          <textarea
            id="chat-message"
            className={styles.input}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              const touch = window.matchMedia(TOUCH).matches
              const key = {
                key: e.key,
                shiftKey: e.shiftKey,
                isComposing: e.nativeEvent.isComposing,
              }
              if (!sendsOnEnter(key, touch)) return
              e.preventDefault()
              submit()
            }}
            placeholder={t('input.placeholder')}
            aria-invalid={(remaining ?? 0) < 0 || undefined}
            aria-describedby={remaining === null ? undefined : 'chat-count'}
          />
          {streaming ? (
            <button
              type="button"
              className={styles.send}
              aria-label={t('input.stop')}
              onClick={stop}
            >
              <SquareIcon size={14} aria-hidden fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              className={styles.send}
              aria-label={t('input.send')}
              disabled={!canSend}
            >
              <ArrowUpIcon size={18} aria-hidden />
            </button>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.hint}>{tHome('enterHint')}</span>
          {remaining !== null && (
            <span id="chat-count" className={styles.count} data-over={remaining < 0 || undefined}>
              {remaining < 0
                ? tHome('over', { count: -remaining })
                : tHome('remaining', { count: remaining })}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
