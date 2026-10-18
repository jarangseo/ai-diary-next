'use client'
import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import {
  type ThemePreference,
  readThemePreference,
  subscribeThemePreference,
  writeThemePreference,
} from '@/lib/theme'
import styles from './ThemeSetting.module.scss'

const OPTIONS: ThemePreference[] = ['system', 'light', 'dark']

// The server cannot know a per-device choice, so it renders 'system' and the client
// corrects it after hydration. The page itself is already in the right theme by then:
// the inline script in the root layout applied it before first paint.
const serverSnapshot = (): ThemePreference => 'system'

export function ThemeSetting() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    serverSnapshot
  )
  const t = useTranslations('Settings.display')

  return (
    <fieldset className={styles.options}>
      <legend className={styles.legend}>{t('legend')}</legend>
      {OPTIONS.map((option) => (
        <label key={option} className={styles.option}>
          <input
            type="radio"
            name="theme"
            value={option}
            checked={preference === option}
            onChange={() => writeThemePreference(option)}
          />
          <span>{t(`options.${option}`)}</span>
        </label>
      ))}
    </fieldset>
  )
}
