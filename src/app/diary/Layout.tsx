'use client'

import styles from './layout.module.scss'
import Gnb from '@/components/Gnb/Gnb'
import Lnb from '@/components/Lnb/Lnb'
import clsx from 'clsx'
import { useState } from 'react'

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }
  return (
    <div className={styles.container}>
      <Gnb isOpen={isOpen} toggleMenu={toggleMenu} />
      <Lnb isOpen={isOpen} />
      <main
        className={clsx(
          styles.main,
          isOpen ? styles.mainOpen : styles.mainClosed
        )}
      >
        {children}
      </main>
    </div>
  )
}
