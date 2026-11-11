'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { SourceEntry } from '@/types/thread'
import { chipLabels, type ChipLabel } from './chipLabels'
import styles from './SourceChips.module.scss'

/**
 * Source chips (#76): the entries a reply drew on, `M월 D일 일기`, at most three, each
 * opening its entry. How each one is worded is `chipLabels`.
 */
export function SourceChips({ entries }: { entries: SourceEntry[] }) {
  'use no memo'
  const t = useTranslations('Sources')
  const locale = useLocale()
  const labels = chipLabels(entries.slice(0, 3), {
    locale,
    currentYear: new Date().getFullYear(),
  })

  const text = (label: ChipLabel) =>
    label.kind === 'titled'
      ? t('chipTitled', { date: label.date, title: label.title })
      : label.kind === 'numbered'
        ? t('chipNumbered', { date: label.date, n: label.n })
        : t('chip', { date: label.date })

  return (
    <ul className={styles.chips} aria-label={t('label')}>
      {labels.map((label) => (
        <li key={label.id}>
          <Link className={styles.chip} href={`/diary/${label.id}`}>
            <span className={styles.text}>{text(label)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
