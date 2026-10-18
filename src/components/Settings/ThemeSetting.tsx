'use client'
import { useSyncExternalStore } from 'react'
import {
  type ThemePreference,
  readThemePreference,
  subscribeThemePreference,
  writeThemePreference,
} from '@/lib/theme'
import styles from './ThemeSetting.module.scss'

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '기기 설정' },
  { value: 'light', label: '낮' },
  { value: 'dark', label: '밤' },
]

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

  return (
    <fieldset className={styles.options}>
      <legend className={styles.legend}>화면 테마</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={preference === option.value}
            onChange={() => writeThemePreference(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
