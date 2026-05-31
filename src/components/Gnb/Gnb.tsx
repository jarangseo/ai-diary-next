'use client'

import styles from './Gnb.module.scss'
import Link from 'next/link'
import { SettingsIcon, LogOutIcon, UserIcon } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export default function Gnb() {
  const { data: session } = useSession()

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <h1 className={styles.logo}>
          <Link href="/diary" aria-label="AI Diary">
            AI Diary
          </Link>
        </h1>

        <nav className={styles.actions}>
          {session ? (
            <>
              <Link
                className={styles.iconButton}
                href="/settings"
                aria-label="설정"
              >
                <SettingsIcon size={20} />
              </Link>
              <button
                className={styles.iconButton}
                onClick={() => signOut({ callbackUrl: '/' })}
                aria-label="로그아웃"
              >
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    width={28}
                    height={28}
                    className={styles.avatar}
                  />
                ) : (
                  <LogOutIcon size={20} />
                )}
              </button>
            </>
          ) : (
            <Link className={styles.iconButton} href="/login" aria-label="로그인">
              <UserIcon size={20} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
