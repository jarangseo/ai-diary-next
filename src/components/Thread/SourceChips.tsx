'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { SourceEntry } from '@/types/thread'
import styles from './SourceChips.module.scss'

/**
 * Source chips (#76): the entries a reply drew on, `M월 D일 일기`, at most three, each
 * opening its entry. The date is a calendar date (`YYYY-MM-DD`), worded by the locale and
 * read in UTC so no zone can move it to another day.
 */
export function SourceChips({ entries }: { entries: SourceEntry[] }) {
  'use no memo'
  const t = useTranslations('Sources')
  const locale = useLocale()
  const day = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' })

  return (
    <ul className={styles.chips} aria-label={t('label')}>
      {entries.slice(0, 3).map((entry) => (
        <li key={entry.id}>
          <Link className={styles.chip} href={`/diary/${entry.id}`}>
            {t('chip', { date: day.format(new Date(`${entry.date}T00:00:00Z`)) })}
          </Link>
        </li>
      ))}
    </ul>
  )
}
