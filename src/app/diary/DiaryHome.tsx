'use client'
import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { PlusIcon } from 'lucide-react'
import { Calendar } from '@/components/Calendar/Calendar'
import { DiaryList } from '@/components/DiaryList/DiaryList'
import { toDateKey } from '@/lib/date'
import type { Diary } from '@/types/diary'
import styles from './DiaryHome.module.scss'

type View = 'calendar' | 'list'

export function DiaryHome({ diaries }: { diaries: Diary[] }) {
  const [view, setView] = useState<View>('calendar')
  const todayKey = toDateKey(new Date())
  const entryDates = diaries.map((d) => d.date)

  return (
    <section className={styles.home}>
      <div className={styles.toolbar}>
        <div className={styles.toggle} role="tablist" aria-label="보기 전환">
          <button
            role="tab"
            aria-selected={view === 'calendar'}
            className={clsx(
              styles.toggleItem,
              view === 'calendar' && styles.active
            )}
            onClick={() => setView('calendar')}
          >
            캘린더
          </button>
          <button
            role="tab"
            aria-selected={view === 'list'}
            className={clsx(styles.toggleItem, view === 'list' && styles.active)}
            onClick={() => setView('list')}
          >
            목록
          </button>
        </div>

        <Link href={`/diary/${todayKey}`} className={styles.writeButton}>
          <PlusIcon size={18} />
          오늘 쓰기
        </Link>
      </div>

      {view === 'calendar' ? (
        <Calendar entryDates={entryDates} />
      ) : (
        <DiaryList diaries={diaries} />
      )}
    </section>
  )
}
