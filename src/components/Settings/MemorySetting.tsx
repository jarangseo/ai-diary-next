'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { settingsApi } from '@/services/settingsServices'
import styles from './MemorySetting.module.scss'

/**
 * `지난 일기 참고하기` (screen 5-3): whether the AI reads the last two weeks of entries
 * (`lib/memory.ts#memoryFor` checks it on every reply). Stored per user, so it follows the
 * account to every device. The switch moves at once and moves back if the save fails.
 */
export function MemorySetting({ initial }: { initial: boolean }) {
  'use no memo'
  const t = useTranslations('Settings.memory')
  const [on, setOn] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = async () => {
    // Not `disabled` while saving: that would drop keyboard focus from the switch.
    if (saving) return
    const next = !on
    setOn(next)
    setSaving(true)
    setFailed(false)
    try {
      await settingsApi.update({ memoryEnabled: next })
    } catch (error) {
      console.error(error)
      setOn(!next)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span id="memory-label" className={styles.label}>
          {t('label')}
        </span>
        <button
          type="button"
          role="switch"
          className={styles.switch}
          aria-checked={on}
          aria-labelledby="memory-label"
          aria-describedby="memory-desc"
          aria-busy={saving || undefined}
          onClick={toggle}
        >
          <span aria-hidden />
        </button>
      </div>
      <p id="memory-desc" className={styles.desc}>
        {t('body')}
      </p>
      {failed && (
        <p className={styles.error} role="alert">
          {t('failed')}
        </p>
      )}
    </div>
  )
}
