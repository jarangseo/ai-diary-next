// The parts of the seed that are decisions rather than I/O, so they can be tested.
//
// Extracted after `--clean` was found to delete the wrong rows: it removed a window
// computed from *today* instead of the rows the seed had written, so cleaning on a later
// day than seeding stranded the earliest entries.

export const SEED_TITLES = [
  '퇴근길에 본 노을',
  '오래 미룬 일을 끝냄',
  '회의가 너무 길었다',
  '오랜만에 운동함',
  '점심에 혼자 걸었다',
  '리뷰에서 막힌 부분',
  '주말 계획을 세웠다',
  '문득 떠오른 생각',
  '커피를 두 잔 마신 날',
  '이유 없이 피곤했다',
  '작은 칭찬을 받았다',
  '정리하다 하루가 감',
]

/**
 * Whether a row was written by the seed.
 *
 * Matched against the exact titles the seed uses, not merely "has a title". Nothing in
 * the app writes `title` today, so the looser test would work — but it is meant to, and
 * the day it does, a loose check would start deleting real entries. Twelve exact strings
 * is a coincidence nobody will have.
 *
 * Deliberately not a date range: which rows the seed created is a fact about the rows,
 * not about when the cleaning happens to run.
 */
export function isSeededEntry(entry) {
  return typeof entry?.title === 'string' && SEED_TITLES.includes(entry.title)
}

/** `daysBack` days before `endIso`, as YYYY-MM-DD. UTC, like the rest of the seed. */
export function shiftDate(endIso, daysBack) {
  const d = new Date(`${endIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

/**
 * The dates the seed writes, oldest first, with `doubledDays` of them carrying two
 * entries.
 *
 * The doubled days sit in the middle of the window, not at the recent end: `/diary/[date]`
 * still resolves an entry by date with `.single()` and returns a 406 once a date holds
 * two rows, and the newest entry is the one most likely to be opened.
 */
export function buildSeedDates({ endDate, entryCount, doubledDays }) {
  const distinct = []
  for (let i = 0; i < entryCount - doubledDays; i++) distinct.push(shiftDate(endDate, i))

  const doubledFrom = Math.floor(distinct.length / 2)
  return [...distinct, ...distinct.slice(doubledFrom, doubledFrom + doubledDays)].sort((a, b) =>
    a < b ? -1 : 1
  )
}
