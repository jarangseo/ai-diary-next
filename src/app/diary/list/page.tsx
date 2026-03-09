'use client'

import Link from 'next/link'
import styles from './page.module.scss'
import {
  ChevronLeftIcon,
  HomeIcon,
  PenIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export default function DiaryListPage() {
  const [isOpen, setIsOpen] = useState(false)
  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }
  return (
    <div className={styles.container}>
      <nav className={styles.gnb}>
        <h1 hidden>
          <Link href="/" aria-label="AI Diary">
            AI Diary
          </Link>
        </h1>
        <ul>
          <li className={styles.menuItem}>
            <Link className={styles.link} href="/">
              <HomeIcon size={24} className={styles.icon} />
              Home
            </Link>
          </li>
        </ul>
        <ul className={styles.user}>
          <li>
            <Link className={styles.link} href="/">
              <UserIcon size={24} className={styles.icon} />
              Login
            </Link>
          </li>
          <li>
            <Link className={styles.link} href="/">
              <SettingsIcon size={24} className={styles.icon} />
              Settings
            </Link>
          </li>
        </ul>
        <button
          type="button"
          className={clsx(styles.toggle, isOpen && styles.toggleOpen)}
          aria-label="Toggle menu"
          onClick={toggleMenu}
        >
          <ChevronLeftIcon size={24} />
        </button>
      </nav>
      <nav
        className={clsx(styles.lnb, isOpen ? styles.lnbShow : styles.lnbHide)}
      >
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
            Customer Center 0000-0000 (9am–6pm, excluding weekends and
            holidays)
          </p>
        </footer>
      </nav>
      <main className={clsx(styles.main, isOpen ? styles.mainOpen : styles.mainClosed)}>
        <article className={styles.diaryList}>
          <header></header>
          <div className={styles.scroll}>
            <video
              src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              autoPlay
              loop
              playsInline
              controls
              className={styles.video}
            ></video>
            <p className={styles.text}>
              Record the feelings you couldn&apos;t put into words. AI helps you
              understand what you feel.
            </p>
            <button className={styles.button}>Start Writing</button>
          </div>
        </article>
      </main>
    </div>
  )
}
