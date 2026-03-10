import styles from './Lnb.module.scss'
import Link from 'next/link'
import { PenIcon, PlusIcon } from 'lucide-react'

import clsx from 'clsx'

export default function Lnb({ isOpen }: { isOpen: boolean }) {
  return (
    <nav className={clsx(styles.lnb, isOpen ? styles.lnbShow : styles.lnbHide)}>
      <h2>
        <Link href="/" className={styles.logoLink} aria-label="AI Diary">
          <PenIcon size={16} />
          AI Diary
        </Link>
      </h2>
      <div className={styles.diaryWrap}>
        <div className={styles.newDiary}>
          <Link className={styles.newDiaryLink} href="/" aria-label="New Diary">
            <PlusIcon size={16} />
            New Diary
          </Link>
        </div>
        <div className={styles.history}></div>
      </div>
      <footer className={styles.footer}>
        <a href="/terms">Terms of Use</a>
        <span> | </span>
        <a href="/privacy">Privacy Policy</a>
        <span> | </span>
        <a href="/faq">FAQ</a>
        <p>
          Customer Center 0000-0000 (9am–6pm, excluding weekends and holidays)
        </p>
      </footer>
    </nav>
  )
}
