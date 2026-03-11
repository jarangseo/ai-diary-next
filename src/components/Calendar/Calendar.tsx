'use client'
import clsx from 'clsx'
import styles from './Calendar.module.scss'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export function Calendar() {
  return (
    <div className={styles.calendar}>
      <header className={styles.header}>
        <h2 className={styles.title}>2026 March</h2>
        <button className={clsx(styles.button, styles.prevButton)}>
          <ChevronLeftIcon size={24} />
        </button>
        <button className={clsx(styles.button, styles.nextButton)}>
          <ChevronRightIcon size={24} />
        </button>
      </header>
      <div className={styles.grid} role="grid" aria-label="Calendar">
        <div className={styles.weekday} role="columnheader">
          Sun
        </div>
        <div className={styles.weekday} role="columnheader">
          Mon
        </div>
        <div className={styles.weekday} role="columnheader">
          Tue
        </div>
        <div className={styles.weekday} role="columnheader">
          Wed
        </div>
        <div className={styles.weekday} role="columnheader">
          Thu
        </div>
        <div className={styles.weekday} role="columnheader">
          Fri
        </div>
        <div className={styles.weekday} role="columnheader">
          Sat
        </div>
        <div className={styles.dayCell}>
          <button type="button">1</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">2</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">3</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">4</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">5</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">6</button>
        </div>
        <div className={styles.dayCell}>
          <button type="button">7</button>
        </div>
      </div>
    </div>
  )
}
