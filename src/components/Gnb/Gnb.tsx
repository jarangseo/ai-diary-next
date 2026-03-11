'use client'

import styles from './Gnb.module.scss'
import Link from 'next/link'
import {
  HomeIcon,
  UserIcon,
  SettingsIcon,
  ChevronLeftIcon,
  LogOutIcon,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import clsx from 'clsx'
import { useUiStore } from '@/stores/uiStore'

export default function Gnb() {
  const { data: session } = useSession()
  const { isLnbOpen, setIsLnbOpen } = useUiStore()
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
        {session ? (
          <>
            <li>
              <button
                className={styles.link}
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    width={40}
                    height={40}
                    className={styles.avatar}
                  />
                ) : (
                  <LogOutIcon size={24} className={styles.icon} />
                )}
                Logout
              </button>
            </li>
            <li>
              <Link className={styles.link} href="/settings">
                <SettingsIcon size={24} className={styles.icon} />
                Settings
              </Link>
            </li>
          </>
        ) : (
          <li>
            <Link className={styles.link} href="/login">
              <UserIcon size={24} className={styles.icon} />
              Login
            </Link>
          </li>
        )}
      </ul>
      <button
        type="button"
        className={clsx(styles.toggle, isLnbOpen && styles.toggleOpen)}
        aria-label="Toggle menu"
        onClick={setIsLnbOpen}
      >
        <ChevronLeftIcon size={24} />
      </button>
    </nav>
  )
}
