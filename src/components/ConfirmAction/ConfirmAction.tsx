'use client'
import { useState } from 'react'
import styles from './ConfirmAction.module.scss'

interface Props {
  label: string
  confirmLabel: string
  question: string
  onConfirm: () => Promise<void>
  tone?: 'danger'
}

/**
 * Two-step confirmation, inline.
 *
 * Deliberately not `window.confirm`: a native dialog blocks the page, cannot be styled or
 * translated, and is dismissed automatically by test automation — so the destructive path
 * it guards would go uncovered. An inline step is testable and reads better.
 */
export function ConfirmAction({ label, confirmLabel, question, onConfirm, tone }: Props) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!asking) {
    return (
      <button
        type="button"
        className={`${styles.trigger} ${tone === 'danger' ? styles.danger : ''}`}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    )
  }

  return (
    <span className={styles.confirm} role="group" aria-label={question}>
      <span className={styles.question}>{question}</span>
      <button
        type="button"
        className={styles.yes}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm()
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? '처리 중…' : confirmLabel}
      </button>
      <button type="button" className={styles.no} onClick={() => setAsking(false)} disabled={busy}>
        취소
      </button>
    </span>
  )
}
