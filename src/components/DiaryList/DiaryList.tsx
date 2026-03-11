'use client'

import clsx from 'clsx'
import { EditIcon, FilterIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import styles from './DiaryList.module.scss'

type DiaryListProps = {
  className?: string
}

export function DiaryList({ className }: DiaryListProps) {
  return (
    <article className={clsx(styles.article, className)}>
      <header className={styles.header}>
        <h2 className={styles.title}>Diary List</h2>
        {/* Search */}
        <button className={styles.button}>
          <SearchIcon size={20} />
        </button>
        {/* Filter */}
        <button className={styles.button}>
          <FilterIcon size={20} />
        </button>
        {/* Edit */}
        <button className={styles.button}>
          <EditIcon size={20} />
        </button>
      </header>
      <ul className={styles.list}>
        <li className={styles.diaryItem}>
          <Link className={styles.diaryItemLink} href="/">
            <strong className={styles.diaryItemTitle}>
              TITLETITLETITLETITLETITLETITLETITLE
            </strong>
            <p className={styles.diaryItemContent}>
              CONTENTCONTENTCON TENTCONTENTC ONTENTCONTENTCON
              TENTCONTENTCONTENTCONTENTCONTENT
            </p>
            <div className={styles.diaryItemFooter}>
              <span className={styles.diaryItemMood}>MOOD emoji</span>
              <span className={styles.diaryItemDate}>2026-03-10</span>
            </div>
          </Link>
        </li>
      </ul>
    </article>
  )
}
