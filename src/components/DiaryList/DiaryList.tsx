import clsx from 'clsx'
import { EditIcon, FilterIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import styles from './DiaryList.module.scss'
import { auth } from '@/auth'
import { getAllDiaries } from '@/lib/db'

type DiaryListProps = {
  className?: string
}

export async function DiaryList({ className }: DiaryListProps) {
  const session = await auth()
  const diaries = await getAllDiaries(session!.user!.id!)

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
        {diaries.map((diary) => (
          <li className={styles.diaryItem} key={diary.date}>
            <Link className={styles.diaryItemLink} href="/">
              <strong className={styles.diaryItemTitle}>{diary.content}</strong>
              <p className={styles.diaryItemContent}>{diary.content}</p>
              <div className={styles.diaryItemFooter}>
                <span className={styles.diaryItemMood}>MOOD emoji</span>
                <span className={styles.diaryItemDate}>{diary.date}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
