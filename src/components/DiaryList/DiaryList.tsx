import Link from 'next/link'
import clsx from 'clsx'
import styles from './DiaryList.module.scss'
import { formatDateLabel } from '@/lib/date'
import type { Diary } from '@/types/diary'

type DiaryListProps = {
  diaries: Diary[]
  className?: string
}

export function DiaryList({ diaries, className }: DiaryListProps) {
  if (diaries.length === 0) {
    return (
      <div className={clsx(styles.empty, className)}>
        <p>아직 기록된 일기가 없어요.</p>
        <p className={styles.emptyHint}>오늘 하루를 첫 일기로 남겨보세요.</p>
      </div>
    )
  }

  return (
    <ul className={clsx(styles.list, className)}>
      {diaries.map((diary) => (
        <li key={diary.date}>
          <Link className={styles.item} href={`/diary/${diary.date}`}>
            <div className={styles.itemHead}>
              <span className={styles.date}>{formatDateLabel(diary.date)}</span>
              {diary.emotion?.primary && (
                <span className={styles.mood}>{diary.emotion.primary}</span>
              )}
            </div>
            <p className={styles.excerpt}>{diary.content}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
