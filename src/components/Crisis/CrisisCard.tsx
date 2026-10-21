'use client'
import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { PhoneIcon } from 'lucide-react'
import { INTERNATIONAL_DIRECTORY_URL, linesFor } from '@/lib/crisisLines'
import styles from './CrisisCard.module.scss'

/**
 * Spec 5-2 "위기 응답" (#77): under the AI's reply when a conversation signals self-harm or
 * suicide. The user's country's lines (a tap calls), who to call in immediate danger, and
 * the promise to keep listening. In place, never a blocking popup.
 *
 * ⚠️ Safety-critical copy and numbers: reviewed by a person before they ship.
 */
export function CrisisCard({ country }: { country: string | null }) {
  'use no memo'
  const t = useTranslations('Crisis')
  const known = linesFor(country)
  // A card per flagged message, so the heading id has to be unique per card.
  const titleId = useId()

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('title')}
      </h2>
      {known ? (
        <ul className={styles.lines}>
          {known.lines.map((line) => (
            <li key={line.id}>
              <a
                className={styles.line}
                href={`tel:${line.tel.replace(/-/g, '')}`}
                aria-label={t('call', {
                  name: t(`lines.${line.id}` as 'lines.kr109'),
                  tel: line.tel,
                })}
              >
                <PhoneIcon size={18} aria-hidden />
                <span className={styles.name}>{t(`lines.${line.id}` as 'lines.kr109')}</span>
                <span className={styles.tel}>{line.tel}</span>
                <span className={styles.hours}>{t('hours')}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : INTERNATIONAL_DIRECTORY_URL ? (
        <a
          className={styles.line}
          href={INTERNATIONAL_DIRECTORY_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('international')}
        </a>
      ) : (
        // TODO(#77): replaced by the directory link once a person has chosen one.
        <p className={styles.pending}>{t('internationalPending')}</p>
      )}
      <p className={styles.note}>
        {t(`emergency.${known ? known.emergency : 'unknown'}` as 'emergency.kr')}
      </p>
      <p className={styles.note}>{t('closing')}</p>
    </section>
  )
}
