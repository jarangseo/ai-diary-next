'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpIcon, SquareIcon, WifiOffIcon } from 'lucide-react'
import { useThreadStream } from '@/hooks/useThreadStream'
import { isWrapUpOffer, shouldOfferWrapUp } from '@/lib/wrapUp'
import { diaryApi } from '@/services/diaryServices'
import type { Message } from '@/types/thread'
import type { DiaryEmotion, DiarySummary, EmotionPick, EmotionSource } from '@/types/diary'
import { canSendMessage, remainingCount, sendsOnEnter } from '@/components/Home/composerRules'
import { takeFirstMessage } from '@/components/Home/firstMessage'
import { titleFromText } from '@/components/Shell/entryTitle'
import { readDraft, writeDraft } from './draft'
import { OfferCard, WrapUpButton, WrapUpFailed } from './WrapUp'
import { countSaid, draftCut, saidSince } from './afterWrapUp'
import { DiaryPane } from './DiaryPane'
import { CrisisCard } from '@/components/Crisis/CrisisCard'
import { SourceChips } from '@/components/Thread/SourceChips'
import { AfterLayout } from './AfterLayout'
import styles from './ChatEntry.module.scss'

interface Props {
  entryId: string
  threadId: string
  /** The AI's title, set at wrap-up. Before it, the first message's first 30 characters. */
  title?: string
  dateLabel: string
  initialMessages: Message[]
  /**
   * Messages left today before the daily limit (spec 5-2), read on the server when the
   * page loads; null when no limit applies (test runs, like the route's bench path).
   */
  remainingToday: number | null
  /** The 일기, once drafted: it takes the centre and the conversation folds aside. */
  summary?: DiarySummary
  emotion?: DiaryEmotion
  emotionSource: EmotionSource
  /** The user's stored zone, for the time the 일기 was made. */
  timeZone: string
  /** A crisis signal was seen in this conversation: the AI does not offer wrap-up. */
  crisis: boolean
  /** Deterministic stream instead of the model — set by the page in test runs. */
  bench?: boolean
}

// navigator.onLine, kept current. The server render assumes online.
const subscribeOnline = (onChange: () => void) => {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// A touch screen as the main pointer: Enter is a new line there and the button sends.
const TOUCH = '(pointer: coarse)'
// How close to the bottom still counts as following the conversation.
const PIN_THRESHOLD_PX = 80
// Where the conversation becomes a side panel beside the 일기, rather than a tab.
const WIDE = '(min-width: 1025px)'
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Screen 1-1 / 1-1m: a 대화로 쓰기 entry while talking; 1-2 / 1-3 once its 일기 is drafted,
 * with the 일기 at the centre and the conversation in a side panel (or a tab on a phone).
 */
export function ChatEntry({
  entryId,
  threadId,
  title,
  dateLabel,
  initialMessages,
  remainingToday,
  summary: storedSummary,
  emotion,
  emotionSource,
  timeZone,
  crisis,
  bench,
}: Props) {
  const t = useTranslations('ChatEntry')
  const tAfter = useTranslations('ChatEntry.after')
  const tHome = useTranslations('Home.input')
  const tShell = useTranslations('Shell')
  const router = useRouter()

  // A draft made in this session, with where it was cut from the conversation (by index:
  // see draftCut). Until the page reloads it stands in for the stored one.
  const [made, setMade] = useState<{ summary: DiarySummary; title?: string; cut: number }>()
  const summary = made?.summary ?? storedSummary
  const wrappedUp = Boolean(summary)
  const cut = made?.cut ?? (storedSummary ? draftCut(initialMessages, storedSummary.madeAt) : 0)

  const { messages, status, send, stop, retry, delivery, limited } = useThreadStream({
    threadId,
    initialMessages,
    bench,
    offersWrapUp: (conversation) =>
      shouldOfferWrapUp({ messages: conversation, isChatEntry: true, wrappedUp, crisis }),
  })
  const [text, setText] = useState('')
  const streaming = status === 'streaming'
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  )

  // Counted here from the server's figure at load: the card replaces the input once the
  // day's messages are used up. A 429 from the server says the same.
  const [sent, setSent] = useState(0)
  const atLimit = limited || (remainingToday !== null && sent >= remainingToday)
  const sendCounted = async (value: string) => {
    const ok = await send(value)
    if (ok) setSent((n) => n + 1)
    return ok
  }
  const retryCounted = async (id: string) => {
    if (await retry(id)) setSent((n) => n + 1)
  }

  // What is being typed stays on this device until it is sent.
  useEffect(() => setText(readDraft(entryId)), [entryId])
  const changeText = (value: string) => {
    setText(value)
    writeDraft(entryId, value)
  }

  // Wrap-up. The offer shows as a card while it is the AI's latest word: talking on, or
  // `조금 더 얘기할게요`, puts it away (the server keeps no record of a decline).
  const [declined, setDeclined] = useState<string[]>([])
  const [wrapping, setWrapping] = useState(false)
  const [wrapFailed, setWrapFailed] = useState(false)
  const lastOffer = messages.findLastIndex(isWrapUpOffer)
  const openOffer =
    !wrappedUp &&
    lastOffer > messages.findLastIndex((m) => m.role === 'user') &&
    !declined.includes(messages[lastOffer].id)
      ? messages[lastOffer].id
      : null
  // `다시 정리` over the user's own edit asks first (spec: "다시 정리하면 고친 부분이 바뀌어요").
  const [confirming, setConfirming] = useState(false)
  const wrapUp = async (confirm = false) => {
    if (summary?.editedAt && !confirm) return setConfirming(true)
    setConfirming(false)
    setWrapping(true)
    setWrapFailed(false)
    try {
      const result = await diaryApi.wrapUp(entryId, confirm)
      // Edited in another tab since this page loaded: the server asks the same question.
      if (result.needsConfirm) return setConfirming(true)
      setMade({ summary: result.summary, title: result.title, cut: messages.length })
      setFresh(true)
      // The sidebar takes the title and loses its 정리 전 badge.
      router.refresh()
    } catch (error) {
      console.error(error)
      setWrapFailed(true)
    } finally {
      setWrapping(false)
    }
  }
  // For buttons: their click event must not reach `confirm`.
  const redraft = () => wrapUp()
  // The user's emotion pick (#84) stands until the page reloads with it stored.
  const [picked, setPicked] = useState<EmotionPick>()
  const pickEmotion = async (pick: EmotionPick) => {
    await diaryApi.setEmotion(entryId, pick)
    setPicked(pick)
  }
  const saveEdit = async (text: string) => {
    const editedAt = await diaryApi.editSummary(entryId, text)
    if (summary) setMade({ summary: { ...summary, text, editedAt }, title: made?.title, cut })
  }

  // After wrap-up: the panel beside the 일기 (wide) or the 대화 tab (narrow).
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false
  )
  const [fresh, setFresh] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // The completion moment: the reader lands on the new 일기.
  useEffect(() => {
    if (fresh) headingRef.current?.focus({ preventScroll: true })
  }, [fresh])

  // Spec 1-2 / 5-2: drafting, could not draft, or drafted before the latest messages.
  const wrapState = wrapping ? (
    <p className={styles.drafting} role="status">
      <span className={styles.typing} aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {tAfter('drafting')}
    </p>
  ) : confirming ? (
    <div className={styles.stale} role="alert">
      <p>{tAfter('confirm')}</p>
      <div className={styles.offerActions}>
        <button type="button" className={styles.primary} onClick={() => wrapUp(true)}>
          {tAfter('redraft')}
        </button>
        <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
          {tAfter('cancel')}
        </button>
      </div>
    </div>
  ) : wrapFailed ? (
    <WrapUpFailed onWrapUp={redraft} busy={wrapping} />
  ) : (
    wrappedUp &&
    saidSince(messages, cut) && (
      <div className={styles.stale} role="status">
        <p>{tAfter('stale')}</p>
        <button type="button" className={styles.secondary} onClick={redraft} disabled={streaming}>
          {tAfter('redraft')}
        </button>
      </div>
    )
  )

  const firstMessage = messages.find((m) => m.role === 'user')
  // Spec 1-1: the header's button only until the AI has offered; never both at once.
  const headerWrapUp =
    !wrappedUp && !atLimit && Boolean(firstMessage) && !messages.some(isWrapUpOffer)
  const heading =
    made?.title ||
    title ||
    (firstMessage && titleFromText(firstMessage.content)) ||
    tShell('untitled')

  // The home's first message waits in sessionStorage (firstMessage.ts). Taken once, on
  // mount, and only into an empty conversation. Deferred a tick so React's development
  // double mount cancels the first attempt instead of sending twice.
  useEffect(() => {
    if (initialMessages.some((m) => m.role === 'user')) return
    const timer = setTimeout(async () => {
      const first = takeFirstMessage(entryId)
      // The sidebar's title comes from the stored first message.
      if (first && (await sendCounted(first))) router.refresh()
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
  // Beside the 일기 the panel scrolls on its own instead, and starts at the latest message.
  const inPanel = wrappedUp && wide
  useEffect(() => {
    const log = logRef.current
    if (inPanel) log?.scrollTo({ top: log.scrollHeight })
    else if (pinned.current) window.scrollTo({ top: document.documentElement.scrollHeight })
  }, [messages, inPanel])

  const canSend = canSendMessage(text) && !streaming && !wrapping
  const remaining = remainingCount(text)

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!canSend) return
    pinned.current = true
    // The message stays on screen whatever happens to it, so the input is cleared now.
    changeText('')
    await sendCounted(text)
  }

  const conversation = (
    <div className={styles.chat}>
      {!online && (
        <p className={styles.offline} role="status">
          <WifiOffIcon size={18} aria-hidden />
          {t('offline')}
        </p>
      )}
      {!wrappedUp && (
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>{heading}</h1>
            <p className={styles.subtitle}>
              {dateLabel} · {t('writing')}
            </p>
          </div>
          {headerWrapUp && (
            <WrapUpButton
              onWrapUp={redraft}
              busy={wrapping || streaming}
              className={styles.secondary}
            />
          )}
        </header>
      )}

      <div
        ref={logRef}
        className={styles.log}
        role="log"
        aria-label={t('log')}
        aria-busy={streaming}
      >
        {messages.map((m, i) => [
          isWrapUpOffer(m) ? (
            m.id === openOffer && (
              <OfferCard
                key={m.id}
                onWrapUp={redraft}
                busy={wrapping}
                onDecline={() => setDeclined((ids) => [...ids, m.id])}
              />
            )
          ) : m.role === 'user' ? (
            <div key={m.id} className={styles.sent}>
              <p className={styles.mine}>{m.content}</p>
              {delivery[m.id] === 'failed' && (
                <div className={styles.failure} role="alert">
                  <span>{t('replyFailed')}</span>
                  <button
                    type="button"
                    className={styles.retry}
                    onClick={() => retryCounted(m.id)}
                    disabled={streaming}
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              {delivery[m.id] === 'unsent' && (
                <div className={styles.failure}>
                  <span>{t('unsent')}</span>
                  {/* Only once back online, and only when asked: never sent by itself. */}
                  {online && (
                    <button
                      type="button"
                      className={styles.retry}
                      onClick={() => retryCounted(m.id)}
                      disabled={streaming}
                    >
                      {t('resend')}
                    </button>
                  )}
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
              {m.toolResults?.map(
                (r) => r.tool === 'crisis' && <CrisisCard key="crisis" country={r.data.country} />
              )}
              {/* Source chips (#76): the entries a reply drew on, at most three. */}
              {m.toolResults?.map(
                (r) =>
                  r.tool === 'sources' && <SourceChips key="sources" entries={r.data.entries} />
              )}
            </div>
          ),
          wrappedUp && i === cut - 1 && (
            <div key="cut" className={styles.cut} role="separator" aria-label={tAfter('cut')}>
              <span aria-hidden>{tAfter('cut')}</span>
            </div>
          ),
        ])}
        {/* Before the first draft the wrap-up states close the log; after it, the 일기 has them. */}
        {!wrappedUp && wrapState}
      </div>

      {atLimit && (
        <div className={styles.limit} role="status">
          <p className={styles.limitTitle}>{t('limit.title')}</p>
          <p className={styles.limitBody}>{t('limit.body')}</p>
          <WrapUpButton onWrapUp={redraft} busy={wrapping} />
        </div>
      )}
      {/* Hidden rather than removed at the limit, so the draft in it is kept. */}
      <form className={styles.composer} onSubmit={submit} hidden={atLimit}>
        <label className={styles.visuallyHidden} htmlFor="chat-message">
          {t('input.label')}
        </label>
        <div className={styles.field}>
          <textarea
            id="chat-message"
            className={styles.input}
            rows={1}
            value={text}
            onChange={(e) => changeText(e.target.value)}
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
            // Locked while the 일기 is drafted (spec 1-2), without losing what is typed.
            readOnly={wrapping}
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

  if (!summary) return conversation
  return (
    <AfterLayout
      dateLabel={dateLabel}
      wide={wide}
      diary={
        <DiaryPane
          title={heading}
          summary={summary}
          emotion={emotion && picked ? { ...emotion, ...picked } : emotion}
          emotionSource={picked ? 'user' : emotionSource}
          said={countSaid(messages, cut)}
          timeZone={timeZone}
          fresh={fresh}
          notice={wrapState}
          onSave={saveEdit}
          onPickEmotion={pickEmotion}
          headingRef={headingRef}
          tabpanel={wide ? undefined : { id: 'diary-pane', labelledBy: 'tab-diary' }}
        />
      }
    >
      {conversation}
    </AfterLayout>
  )
}
