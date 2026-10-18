import { getLocale, getTranslations } from 'next-intl/server'
import { getSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { HomeComposer } from './HomeComposer'
import styles from './Home.module.scss'

interface Props {
  userId?: string
  name: string
  /**
   * The memory line under the greeting: one thing from the last two weeks of entries
   * (#76). Nothing fills it yet, and it renders nothing while empty — which is also
   * what the spec asks for when there is nothing to remember or memory is off.
   */
  memoryLine?: string
}

async function readTimeZone(userId: string | undefined) {
  if (!userId) return DEFAULT_SETTINGS.timezone
  try {
    return (await getSettings(userId)).settings.timezone
  } catch (error) {
    console.error('Home: settings unavailable, dating in UTC.', error)
    return DEFAULT_SETTINGS.timezone
  }
}

/** Screen 1-0: the greeting, the writing-mode tabs and the first message's input. */
export async function Home({ userId, name, memoryLine }: Props) {
  const [t, locale, timeZone] = await Promise.all([
    getTranslations('Home'),
    getLocale(),
    readTimeZone(userId),
  ])

  // Today in the user's stored zone, worded by the locale — never a hand-built string.
  const today = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone,
  }).format(new Date())

  return (
    <section className={styles.home} aria-labelledby="home-greeting">
      <div className={styles.intro}>
        <p className={styles.today}>{today}</p>
        <h1 className={styles.greeting} id="home-greeting">
          {name ? t.rich('greeting', { name, br: () => <br /> }) : t('greetingNoName')}
        </h1>
        {memoryLine && <p className={styles.memory}>{memoryLine}</p>}
      </div>

      <div className={styles.start}>
        <div className={styles.modes} role="group" aria-label={t('modes.label')}>
          <button type="button" className={styles.mode} aria-pressed="true">
            {t('modes.chat')}
          </button>
          {/* 직접 쓰기 ships in v2.1. Shown so the choice is visible, but aria-disabled
              rather than disabled: it stays focusable, so a screen reader reaches the
              explanation instead of skipping the control. */}
          <button
            type="button"
            className={styles.mode}
            aria-pressed="false"
            aria-disabled="true"
            aria-describedby="home-write-soon"
          >
            {t('modes.write')}
            <span className={styles.soon} aria-hidden>
              {t('modes.writeSoon')}
            </span>
          </button>
          <span className={styles.visuallyHidden} id="home-write-soon">
            {t('modes.writeUnavailable')}
          </span>
        </div>

        <HomeComposer />
      </div>
    </section>
  )
}
