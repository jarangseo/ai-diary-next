import Link from 'next/link'
import { LockIcon } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { greetingEntry } from '@/lib/memory'
import { todayIn } from '@/lib/entryGroups'
import { getEntries } from '@/components/Shell/entries'
import { titleFromText } from '@/components/Shell/entryTitle'
import { HomeComposer } from './HomeComposer'
import styles from './Home.module.scss'

interface Props {
  userId?: string
  name: string
  /**
   * Screen 5-1: the user has no entries yet (also after deleting them all). The greeting
   * says hello instead of remembering, a sentence explains 대화로 쓰기, and a line says
   * where the words go.
   */
  firstRun?: boolean
}

async function readSettings(userId: string | undefined) {
  if (!userId) return DEFAULT_SETTINGS
  try {
    return (await getSettings(userId)).settings
  } catch (error) {
    console.error('Home: settings unavailable, dating in UTC.', error)
    return DEFAULT_SETTINGS
  }
}

/** Screen 1-0: the greeting, the writing-mode tabs and the first message's input. */
export async function Home({ userId, name, firstRun }: Props) {
  const [t, locale, settings, entries] = await Promise.all([
    getTranslations('Home'),
    getLocale(),
    readSettings(userId),
    // The list the sidebar reads in this request (`getEntries` is cached): no extra query.
    userId ? getEntries(userId) : Promise.resolve([]),
  ])
  const timeZone = settings.timezone

  // The memory line (#76): the newest titled entry of the last two weeks, in a fixed
  // sentence — "어제 ‘회의가 길었던 날’ 이야기를 남겼어요." Not on first run (there is none).
  const remembered = firstRun
    ? null
    : greetingEntry(
        // Titled as in the sidebar: the AI title, or a written entry's first line. A chat
        // entry not yet wrapped up has neither and is left out.
        entries.map((d) => ({
          id: d.id,
          date: d.date,
          title: d.title || (d.mode === 'write' ? titleFromText(d.content) : undefined),
        })),
        todayIn(new Date(), timeZone),
        settings.memoryEnabled
      )
  const memoryLine =
    remembered &&
    t('memoryLine', {
      when: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        -remembered.daysAgo,
        'day'
      ),
      title: remembered.title,
    })

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
          {firstRun
            ? name
              ? t.rich('firstRun.greeting', { name, br: () => <br /> })
              : t.rich('firstRun.greetingNoName', { br: () => <br /> })
            : name
              ? t.rich('greeting', { name, br: () => <br /> })
              : t('greetingNoName')}
        </h1>
        {firstRun ? (
          <p className={styles.guide}>{t('firstRun.guide')}</p>
        ) : (
          memoryLine && <p className={styles.memory}>{memoryLine}</p>
        )}
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
        {firstRun && (
          <p className={styles.privacy}>
            <LockIcon size={16} aria-hidden className={styles.privacyIcon} />
            <span>
              {t('firstRun.privacy')} <Link href="/settings">{t('firstRun.privacyMore')}</Link>
            </span>
          </p>
        )}
      </div>
    </section>
  )
}
