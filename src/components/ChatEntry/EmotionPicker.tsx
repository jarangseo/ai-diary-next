'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { EMOTIONS, type EmotionPrimary } from '@/lib/emotion'
import type { EmotionPick } from '@/types/diary'
import styles from './ChatEntry.module.scss'

interface Props {
  initial: EmotionPick
  /** Stores the pick; rejects when it could not. */
  onSave: (pick: EmotionPick) => Promise<void>
  onClose: () => void
}

/**
 * #84: the emotion chip opens this. The primary emotion and an optional secondary one, as
 * two radio groups; the pick becomes the user's, and re-analysis leaves it alone.
 */
export function EmotionPicker({ initial, onSave, onClose }: Props) {
  // Opened on a tap and gone after: not worth the compiler's memo cache in shipped JS.
  'use no memo'
  const t = useTranslations('ChatEntry.after')
  const tEmotion = useTranslations('Emotion')
  const [pick, setPick] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const group = (name: 'primary' | 'secondary', options: (EmotionPrimary | undefined)[]) => (
    <fieldset className={styles.pickGroup}>
      <legend>{t(name === 'primary' ? 'primaryEmotion' : 'secondaryEmotion')}</legend>
      {options.map((key) => (
        <label key={key ?? 'none'} className={styles.pickOption}>
          <input
            type="radio"
            name={name}
            checked={pick[name] === key}
            // Opening moves focus to the current pick.
            autoFocus={name === 'primary' && key === initial.primary}
            disabled={name === 'secondary' && key === pick.primary}
            onChange={() =>
              setPick(
                name === 'primary'
                  ? // The secondary cannot be the same emotion.
                    {
                      primary: key!,
                      secondary: pick.secondary === key ? undefined : pick.secondary,
                    }
                  : { ...pick, secondary: key }
              )
            }
          />
          {key && (
            <span
              className={styles.emotionDot}
              style={{ '--emotion': `var(--emotion-${key})` } as React.CSSProperties}
              aria-hidden
            />
          )}
          {key ? tEmotion(key) : t('noEmotion')}
        </label>
      ))}
    </fieldset>
  )

  return (
    <form
      id="emotion-picker"
      className={styles.picker}
      aria-label={t('pickEmotion')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        setFailed(false)
        try {
          await onSave(pick)
          onClose()
        } catch (error) {
          console.error(error)
          setFailed(true)
          setSaving(false)
        }
      }}
    >
      {group('primary', [...EMOTIONS])}
      {group('secondary', [undefined, ...EMOTIONS])}
      {failed && (
        <p className={styles.limitBody} role="alert">
          {t('saveFailed')}
        </p>
      )}
      <div className={styles.offerActions}>
        <button
          type="submit"
          className={styles.primary}
          disabled={saving}
          aria-busy={saving || undefined}
        >
          {t('save')}
        </button>
        <button type="button" className={styles.secondary} onClick={onClose} disabled={saving}>
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
