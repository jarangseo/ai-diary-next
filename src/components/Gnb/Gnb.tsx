import styles from './Gnb.module.scss'
import Link from 'next/link'
import { HomeIcon, UserIcon, SettingsIcon, ChevronLeftIcon } from 'lucide-react'

import clsx from 'clsx'

export default function Gnb({
  isOpen,
  toggleMenu,
}: {
  isOpen: boolean
  toggleMenu: () => void
}) {
  return (
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
  )
}
