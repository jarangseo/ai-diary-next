'use client'

import styles from './layout.module.scss'
import Gnb from '@/components/Gnb/Gnb'
import Lnb from '@/components/Lnb/Lnb'
import clsx from 'clsx'

import { useUiStore } from '@/stores/uiStore'

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLnbOpen } = useUiStore()

  return (
    <div className={styles.container}>
      <Gnb />
      <Lnb />
      <main
        className={clsx(
          styles.main,
          isLnbOpen ? styles.mainOpen : styles.mainClosed
        )}
      >
        {children}
      </main>
    </div>
  )
}
