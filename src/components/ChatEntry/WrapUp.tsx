'use client'
import { useTranslations } from 'next-intl'
import styles from './ChatEntry.module.scss'

interface WrapUpProps {
  onWrapUp: () => void
  /** A draft is being made: the buttons wait for it (spec 1-2, input locked meanwhile). */
  busy: boolean
}

/** The `일기로 정리하기` button, the same wherever it appears. */
export function WrapUpButton({ onWrapUp, busy, className }: WrapUpProps & { className?: string }) {
  const t = useTranslations('ChatEntry.offer')
  return (
    <button
      type="button"
      className={className ?? styles.primary}
      onClick={onWrapUp}
      disabled={busy}
      aria-busy={busy || undefined}
    >
      {t('accept')}
    </button>
  )
}

/**
 * "오늘 이야기가 꽤 모였어요. 여기까지 일기로 정리해 둘까요?" — the AI's turn, stored as a message
 * with no text of its own, so the words come from the user's locale.
 */
export function OfferCard({ onWrapUp, busy, onDecline }: WrapUpProps & { onDecline: () => void }) {
  const t = useTranslations('ChatEntry.offer')
  return (
    <div className={styles.offer}>
      <p>{t('text')}</p>
      <div className={styles.offerActions}>
        <WrapUpButton onWrapUp={onWrapUp} busy={busy} />
        <button type="button" className={styles.secondary} onClick={onDecline} disabled={busy}>
          {t('decline')}
        </button>
      </div>
    </div>
  )
}

/** Spec 5-2: the draft could not be made; the conversation is untouched. */
export function WrapUpFailed({ onWrapUp, busy }: WrapUpProps) {
  const t = useTranslations('ChatEntry.wrapUpFailed')
  return (
    <div className={styles.wrapUpFailed} role="alert">
      <p className={styles.limitTitle}>{t('title')}</p>
      <p className={styles.limitBody}>{t('body')}</p>
      <button
        type="button"
        className={styles.primary}
        onClick={onWrapUp}
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {t('retry')}
      </button>
    </div>
  )
}
