'use client'
import { useRef, useState, type ReactNode, type Ref } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { EmotionPending } from '@/components/Diary/EmotionPending'
import { EmotionPicker } from './EmotionPicker'
import { Signature } from '@/components/Signature/Signature'
import type { DiaryEmotion, DiarySummary, EmotionPick, EmotionSource } from '@/types/diary'
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
  /** `다듬기`: stores the user's edit; rejects when it could not. */
  onSave: (text: string) => Promise<void>
  /** The emotion chip's picker (#84): stores the user's pick; rejects when it could not. */
  onPickEmotion: (pick: EmotionPick) => Promise<void>
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
  onSave,
  onPickEmotion,
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

  // `다듬기`: the 일기 becomes its own editor, in place.
  const [draft, setDraft] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const editRef = useRef<HTMLButtonElement>(null)
  const [picking, setPicking] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const closePicker = () => {
    setPicking(false)
    requestAnimationFrame(() => chipRef.current?.focus())
  }
  const labels = emotions.map((key) => tEmotion(key)).join(' · ')
  const close = () => {
    setDraft(undefined)
    setSaveFailed(false)
    requestAnimationFrame(() => editRef.current?.focus())
  }
  const save = async () => {
    setSaving(true)
    setSaveFailed(false)
    try {
      await onSave(draft!.trim())
      close()
    } catch (error) {
      console.error(error)
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

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
          <Signature className={styles.signature} />
          {t('fresh')}
        </p>
      )}
      {/* The AI suggests, the user owns it: the chip opens the picker (#84). */}
      {emotion ? (
        <>
          <p className={styles.emotionLine}>
            <button
              ref={chipRef}
              type="button"
              className={styles.emotionChip}
              aria-label={`${t('pickEmotion')}: ${labels}`}
              aria-expanded={picking}
              aria-controls="emotion-picker"
              onClick={() => (picking ? closePicker() : setPicking(true))}
            >
              {emotions.map((key) => (
                <span
                  key={key}
                  className={styles.emotionDot}
                  style={{ '--emotion': `var(--emotion-${key})` } as React.CSSProperties}
                  aria-hidden
                />
              ))}
              {labels}
            </button>
            {emotionSource === 'ai' && <span className={styles.emotionNote}>{t('aiEmotion')}</span>}
          </p>
          {picking && (
            <EmotionPicker
              initial={{ primary: emotion.primary, secondary: emotion.secondary }}
              onSave={onPickEmotion}
              onClose={closePicker}
            />
          )}
        </>
      ) : (
        // The emotion is analysed after the draft is stored, so it arrives a moment later.
        <EmotionPending />
      )}
      <h1 id="diary-title" className={styles.diaryTitle} ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {draft === undefined ? (
        <div className={styles.diaryText}>
          {summary.text
            .split(/\n+/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      ) : (
        <form
          className={styles.diaryEdit}
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <textarea
            className={styles.diaryText}
            aria-label={t('editLabel')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
            }}
            maxLength={10_000}
            rows={12}
            autoFocus
          />
          {saveFailed && (
            <p className={styles.limitBody} role="alert">
              {t('saveFailed')}
            </p>
          )}
          <div className={styles.offerActions}>
            <button
              type="submit"
              className={styles.primary}
              disabled={saving || !draft.trim()}
              aria-busy={saving || undefined}
            >
              {t('save')}
            </button>
            <button type="button" className={styles.secondary} onClick={close} disabled={saving}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      <footer className={styles.diaryMeta}>
        <span>{t('made', { count: said, time })}</span>
        {draft === undefined && (
          <button
            ref={editRef}
            type="button"
            className={styles.secondary}
            onClick={() => setDraft(summary.text)}
          >
            {t('edit')}
          </button>
        )}
      </footer>
    </article>
  )
}
