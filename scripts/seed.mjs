// Seed deterministic demo data for local development and performance measurement.
//
// Deterministic on purpose: docs/PERFORMANCE.md numbers are only comparable if the
// data behind them is identical between runs, so nothing here uses randomness.
//
//   pnpm seed --list                 list candidate user ids (no content shown)
//   pnpm seed -- <userId>            seed under that user
//   pnpm seed -- <userId> --clean    remove seeded rows and stop
//
// Seeded entries live in the last 60 days, chosen so they cannot collide with the
// existing data in this database (which ends 2026-06-02). Cleanup is scoped to that
// window, so real entries are never touched.
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run via `pnpm seed`).')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const positional = args.filter((a) => !a.startsWith('--'))

if (flag('list')) {
  const { data, error } = await db.from('diaries').select('user_id,date')
  if (error) throw error
  const byUser = new Map()
  for (const r of data) {
    const e = byUser.get(r.user_id) ?? { rows: 0, first: r.date, last: r.date }
    e.rows++
    if (r.date < e.first) e.first = r.date
    if (r.date > e.last) e.last = r.date
    byUser.set(r.user_id, e)
  }
  console.log('user_id'.padEnd(40), 'rows'.padStart(5), '  first        last')
  for (const [id, e] of [...byUser].sort((a, b) => b[1].rows - a[1].rows)) {
    console.log(id.padEnd(40), String(e.rows).padStart(5), ` ${e.first}   ${e.last}`)
  }
  process.exit(0)
}

const USER_ID = positional[0]
if (!USER_ID) {
  console.error('Usage: pnpm seed -- <userId>   (find one with `pnpm seed --list`)')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Shape of the seed — these numbers are the benchmark scenario
// ---------------------------------------------------------------------------
const ENTRY_COUNT = 60
const DOUBLED_DAYS = 5 // days carrying two entries — impossible before migration 001
const THREAD_MESSAGES = 60
const END_DATE = args.find((a) => a.startsWith('--end='))?.slice(6) ?? new Date().toISOString().slice(0, 10)

const EMOTIONS = ['joy', 'excitement', 'calm', 'tired', 'sad', 'anxious', 'angry']
const SUMMARIES = [
  '작은 성취가 있었던 하루',
  '기대와 긴장이 섞인 하루',
  '조용하고 정돈된 하루',
  '체력이 먼저 바닥난 하루',
  '마음이 가라앉았던 하루',
  '결정을 앞두고 흔들린 하루',
  '참다가 결국 말한 하루',
]
const TITLES = [
  '퇴근길에 본 노을', '오래 미룬 일을 끝냄', '회의가 너무 길었다', '오랜만에 운동함',
  '점심에 혼자 걸었다', '리뷰에서 막힌 부분', '주말 계획을 세웠다', '문득 떠오른 생각',
  '커피를 두 잔 마신 날', '이유 없이 피곤했다', '작은 칭찬을 받았다', '정리하다 하루가 감',
]
const BODY = [
  '아침부터 일정이 밀렸다. ', '생각보다 오래 걸렸고 중간에 한 번 처음부터 다시 했다. ',
  '그래도 마무리는 지었다. ', '점심 이후로는 집중이 잘 됐다. ',
  '오후에 이야기를 나누면서 정리가 됐다. ', '저녁에는 조금 걸었다. ',
  '내일은 하나만 덜어내고 싶다. ', '기록으로 남겨두면 나중에 도움이 될 것 같다. ',
]
const QUESTIONS = [
  ['오늘 가장 무겁게 느껴진 건 뭐였어?', '내일 하나만 덜어낸다면 뭘 덜어낼까?'],
  ['그 순간에 어떤 마음이 먼저 들었어?'],
  ['비슷한 하루가 최근에 또 있었을까?', '그때는 어떻게 넘겼어?'],
]

const shiftDate = (endIso, daysBack) => {
  const d = new Date(`${endIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

// Distinct dates: the last `DOUBLED_DAYS` dates each carry a second entry.
const dates = []
for (let i = 0; i < ENTRY_COUNT - DOUBLED_DAYS; i++) dates.push(shiftDate(END_DATE, i))
const allDates = [...dates, ...dates.slice(0, DOUBLED_DAYS)].sort((a, b) => (a < b ? -1 : 1))
const WINDOW_START = allDates[0]
const WINDOW_END = allDates.at(-1)

// ---------------------------------------------------------------------------
// Clean first — makes re-seeding between measurements safe and repeatable.
// Deleting diaries cascades to their threads and messages.
// ---------------------------------------------------------------------------
const { error: delErr, count: deleted } = await db
  .from('diaries')
  .delete({ count: 'exact' })
  .eq('user_id', USER_ID)
  .gte('date', WINDOW_START)
  .lte('date', WINDOW_END)
if (delErr) throw delErr
console.log(`cleaned ${deleted ?? 0} rows in ${WINDOW_START}..${WINDOW_END}`)

if (flag('clean')) process.exit(0)

// ---------------------------------------------------------------------------
// Diaries
// ---------------------------------------------------------------------------
const entries = allDates.map((date, i) => {
  const emotion = EMOTIONS[i % EMOTIONS.length]
  const recordOnly = i % 11 === 0 // a few entries carry no emotion — the grey calendar dot
  const body = Array.from({ length: 6 + (i % 5) }, (_, k) => BODY[(i + k) % BODY.length]).join('')
  const created = `${date}T${String(9 + (i % 12)).padStart(2, '0')}:00:00Z`
  return {
    user_id: USER_ID,
    date,
    title: TITLES[i % TITLES.length],
    content: body,
    is_record_only: recordOnly,
    emotion_primary: recordOnly ? null : emotion,
    emotion_score: recordOnly ? null : 30 + ((i * 7) % 60),
    emotion_summary: recordOnly ? null : SUMMARIES[i % SUMMARIES.length],
    emotion_questions: recordOnly ? null : QUESTIONS[i % QUESTIONS.length],
    created_at: created,
    updated_at: created,
  }
})

const { data: inserted, error: insErr } = await db.from('diaries').insert(entries).select('id,date')
if (insErr) throw insErr
console.log(`inserted ${inserted.length} diaries (${WINDOW_START}..${WINDOW_END}, ${DOUBLED_DAYS} days doubled)`)

// ---------------------------------------------------------------------------
// One thread on the most recent entry — the INP measurement target
// ---------------------------------------------------------------------------
const latest = inserted.reduce((a, b) => (a.date >= b.date ? a : b))
const { data: thread, error: thrErr } = await db
  .from('threads')
  .insert({ user_id: USER_ID, diary_id: latest.id, kind: 'diary', title: '하루 정리' })
  .select('id')
  .single()
if (thrErr) throw thrErr

const messages = Array.from({ length: THREAD_MESSAGES }, (_, i) => {
  const isUser = i % 2 === 0
  const content = isUser
    ? BODY[i % BODY.length].trim()
    : Array.from({ length: 4 + (i % 6) }, (_, k) => BODY[(i + k) % BODY.length]).join('')
  return {
    thread_id: thread.id,
    role: isUser ? 'user' : 'assistant',
    content,
    // One assistant message carries a tool result, so the generative-UI path has
    // something to render on a freshly loaded thread rather than only mid-stream.
    tool_results:
      i === 1
        ? [{ tool: 'emotion', data: { primary: 'tired', score: 68, summary: SUMMARIES[3], questions: QUESTIONS[0] } }]
        : null,
    created_at: new Date(Date.parse(`${latest.date}T10:00:00Z`) + i * 60_000).toISOString(),
  }
})
const { error: msgErr } = await db.from('messages').insert(messages)
if (msgErr) throw msgErr
console.log(`inserted 1 thread with ${messages.length} messages (diary ${latest.date})`)
