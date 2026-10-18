'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useLocale } from 'next-intl'
import { PlusIcon } from 'lucide-react'
import { Calendar } from '@/components/Calendar/Calendar'
import { DiaryList } from '@/components/DiaryList/DiaryList'
import { formatDateLabel, toDateKey } from '@/lib/date'
import type { Diary } from '@/types/diary'
import styles from './DiaryHome.module.scss'

type View = 'calendar' | 'list'

type DiaryHomeProps = {
  diaries: Diary[]
  view: View
  /** 'YYYY-MM-DD' — narrows the list to one day (the calendar sends days with several entries here) */
  dateFilter?: string
}

export function DiaryHome({ diaries, view, dateFilter }: DiaryHomeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const todayKey = toDateKey(new Date())
  const listed = dateFilter ? diaries.filter((d) => d.date === dateFilter) : diaries

  // Reflect view state in the URL → going back from a detail page restores list/calendar
  const selectView = (next: View) => {
    router.replace(next === 'list' ? `${pathname}?view=list` : pathname, {
      scroll: false,
    })
  }

  return (
    <section className={styles.home}>
      <div className={styles.toolbar}>
        <div className={styles.toggle} role="tablist" aria-label="보기 전환">
          <button
            role="tab"
            aria-selected={view === 'calendar'}
            className={clsx(styles.toggleItem, view === 'calendar' && styles.active)}
            onClick={() => selectView('calendar')}
          >
            캘린더
          </button>
          <button
            role="tab"
            aria-selected={view === 'list'}
            className={clsx(styles.toggleItem, view === 'list' && styles.active)}
            onClick={() => selectView('list')}
          >
            목록
          </button>
        </div>

        <Link href={`/diary/write?date=${todayKey}`} className={styles.writeButton}>
          <PlusIcon size={18} />
          오늘 쓰기
        </Link>
      </div>

      {view === 'list' && dateFilter && (
        <div className={styles.filter}>
          <span>{formatDateLabel(dateFilter, locale)}</span>
          <Link href={`${pathname}?view=list`} className={styles.filterClear}>
            전체 보기
          </Link>
        </div>
      )}

      {view === 'list' ? <DiaryList diaries={listed} /> : <Calendar entries={diaries} />}
    </section>
  )
}
