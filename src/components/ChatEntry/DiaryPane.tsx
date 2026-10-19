'use client'
import type { ReactNode, Ref } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { EmotionPending } from '@/components/Diary/EmotionPending'
import type { DiaryEmotion, DiarySummary, EmotionSource } from '@/types/diary'
import styles from './ChatEntry.module.scss'

interface Props {
  title: string
  summary: DiarySummary
  emotion?: DiaryEmotion
  emotionSource: EmotionSource
  /** "대화 N개를 정리했어요": the user's messages the draft was made from. */
  said: number
  /** The user's stored zone, so the server and the browser print the same time. */
  timeZone: string
  /** Drafted a moment ago in this session: the completion moment plays. */
  fresh: boolean
  /** Drafting again, could not, or outdated by later messages: above the 일기. */
  notice?: ReactNode
  headingRef: Ref<HTMLHeadingElement>
  /** Present on narrow screens, where the 일기 and the 대화 are tabs. */
  tabpanel?: { id: string; labelledBy: string }
}

/** Screen 1-2 / 1-3: a chat entry's 일기, at the centre once it is drafted. */
export function DiaryPane({
  title,
  summary,
  emotion,
  emotionSource,
  said,
  timeZone,
  fresh,
  notice,
  headingRef,
  tabpanel,
}: Props) {
  // Static text that re-renders only when the entry does: the compiler's memo cache would
  // add ~1 KB of shipped JS here for nothing (the bundle is near its 250 KB budget).
  'use no memo'
  const t = useTranslations('ChatEntry.after')
  const tEmotion = useTranslations('Emotion')
  const locale = useLocale()
  const emotions = emotion ? [emotion.primary, emotion.secondary].filter((e) => e != null) : []
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(summary.madeAt)

  return (
    <article
      id="diary-pane"
      className={styles.diary}
      data-fresh={fresh || undefined}
      role={tabpanel ? 'tabpanel' : undefined}
      aria-labelledby={tabpanel?.labelledBy ?? 'diary-title'}
    >
      {notice}
      {fresh && !notice && (
        <p className={styles.fresh}>
          <Signature />
          {t('fresh')}
        </p>
      )}
      {/* Display only; changing it is #84. */}
      {emotions.length > 0 ? (
        <p className={styles.emotionLine}>
          <span className={styles.emotionChip}>
            {emotions.map((key) => (
              <span
                key={key}
                className={styles.emotionDot}
                style={{ '--emotion': `var(--emotion-${key})` } as React.CSSProperties}
                aria-hidden
              />
            ))}
            {emotions.map((key) => tEmotion(key)).join(' · ')}
          </span>
          {emotionSource === 'ai' && <span className={styles.emotionNote}>{t('aiEmotion')}</span>}
        </p>
      ) : (
        // The emotion is analysed after the draft is stored, so it arrives a moment later.
        <EmotionPending />
      )}
      <h1 id="diary-title" className={styles.diaryTitle} ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      <div className={styles.diaryText}>
        {summary.text
          .split(/\n+/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
      <footer className={styles.diaryMeta}>
        <span>{t('made', { count: said, time })}</span>
      </footer>
    </article>
  )
}

/**
 * The single-ink drawing that marks the completion moment (design system: empty states,
 * first run and this moment only). Drawn stroke by stroke when it appears.
 */
function Signature() {
  'use no memo'
  return (
    <svg
      className={styles.signature}
      width="56"
      height="56"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        pathLength={1}
        d="M38 40 C38 26 52 18 64 20 C78 22 86 32 84 46 C82 58 72 64 60 64 C48 64 38 56 38 40 Z"
      />
      <path pathLength={1} d="M42 30 C32 30 26 42 30 54 C33 60 40 58 42 50" />
      <path pathLength={1} d="M80 28 C90 30 96 42 92 54 C89 60 82 58 81 50" />
      <path pathLength={1} d="M54 54 C58 58 66 58 70 54" />
      <path pathLength={1} d="M46 62 C40 74 38 90 40 104 M76 62 C82 74 86 90 84 104" />
      <path pathLength={1} d="M34 106 C50 109 72 109 92 106" />
      <path pathLength={1} d="M86 92 C96 90 102 82 100 72" />
      <circle cx="54" cy="40" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="70" cy="40" r="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="62" cy="49" rx="3.4" ry="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}
