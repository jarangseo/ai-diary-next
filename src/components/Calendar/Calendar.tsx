'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import styles from './Calendar.module.scss'
import { WEEKDAYS_KO, toDateKey } from '@/lib/date'

type CalendarProps = {
  /** dates that have an entry ('YYYY-MM-DD') */
  entryDates?: string[]
}

export function Calendar({ entryDates = [] }: CalendarProps) {
  const router = useRouter()
  const today = new Date()
  const todayKey = toDateKey(today)
  const entrySet = new Set(entryDates)

  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(), // 0-indexed
  })

  const startWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const pad = (n: number) => String(n).padStart(2, '0')

  const goPrev = () =>
    setView(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  const goNext = () =>
    setView(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )

  return (
    <div className={styles.calendar}>
      <header className={styles.header}>
        <button
          className={styles.navButton}
          onClick={goPrev}
          aria-label="이전 달"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <h2 className={styles.title}>
          {view.year}년 {view.month + 1}월
        </h2>
        <button
          className={styles.navButton}
          onClick={goNext}
          aria-label="다음 달"
        >
          <ChevronRightIcon size={20} />
        </button>
      </header>

      <div className={styles.grid} role="grid" aria-label="달력">
        {WEEKDAYS_KO.map((w) => (
          <div key={w} className={styles.weekday} role="columnheader">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} className={styles.empty} />
          }
          const dateKey = `${view.year}-${pad(view.month + 1)}-${pad(day)}`
          const hasEntry = entrySet.has(dateKey)
          const isToday = dateKey === todayKey
          return (
            <button
              key={dateKey}
              type="button"
              className={clsx(styles.day, isToday && styles.today)}
              onClick={() =>
                router.push(
                  hasEntry ? `/diary/${dateKey}` : `/diary/write?date=${dateKey}`
                )
              }
              aria-label={`${view.month + 1}월 ${day}일${
                hasEntry ? ', 일기 있음' : ', 일기 작성'
              }`}
            >
              <span className={styles.dayNum}>{day}</span>
              {hasEntry && <span className={styles.dot} aria-hidden />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
