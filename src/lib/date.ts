export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

/** Date → 'YYYY-MM-DD' (local time) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → Korean date label, e.g. '5월 31일 (토)' */
export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m}월 ${d}일 (${WEEKDAYS_KO[date.getDay()]})`
}
