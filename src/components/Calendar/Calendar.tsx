'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import styles from './Calendar.module.scss'
import { WEEKDAYS_KO, toDateKey } from '@/lib/date'

type CalendarProps = {
  /** every entry's id and date ('YYYY-MM-DD'); a date may appear more than once */
  entries?: { id: string; date: string }[]
}

export function Calendar({ entries = [] }: CalendarProps) {
  const router = useRouter()
  const today = new Date()
  const todayKey = toDateKey(today)
  const idsByDate = new Map<string, string[]>()
  for (const { id, date } of entries) {
    idsByDate.set(date, [...(idsByDate.get(date) ?? []), id])
  }

  // One entry opens it; several open that day's list, since there is no single entry
  // the date could mean.
  const hrefFor = (dateKey: string) => {
    const ids = idsByDate.get(dateKey) ?? []
    if (ids.length === 0) return `/diary/write?date=${dateKey}`
    if (ids.length === 1) return `/diary/${ids[0]}`
    return `/diary?view=list&date=${dateKey}`
  }

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
        <button className={styles.navButton} onClick={goPrev} aria-label="이전 달">
          <ChevronLeftIcon size={20} />
        </button>
        <h2 className={styles.title}>
          {view.year}년 {view.month + 1}월
        </h2>
        <button className={styles.navButton} onClick={goNext} aria-label="다음 달">
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
          const hasEntry = idsByDate.has(dateKey)
          const isToday = dateKey === todayKey
          return (
            <button
              key={dateKey}
              type="button"
              className={clsx(styles.day, isToday && styles.today)}
              onClick={() => router.push(hrefFor(dateKey))}
              aria-label={`${view.month + 1}월 ${day}일${hasEntry ? ', 일기 있음' : ', 일기 작성'}`}
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
