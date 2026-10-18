// Fill `diaries.memory_note` (migration 003, #108) for entries written before notes existed.
//
// New entries get their note from the emotion-analysis call. Existing ones need one model
// call each, so a person runs this — it spends money. It writes only `memory_note`, only
// where it is null, so it never touches an emotion, a draft, or a note already written,
// and re-running it continues where it stopped.
//
//   pnpm backfill:memory-notes            dry run: count what would be filled (no calls)
//   pnpm backfill:memory-notes --apply    fill them, one entry at a time
//
// It uses whichever database `.env.local` points at. Apply migration 003 there first.
// Output is counts only, never diary text.
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run via `pnpm backfill:memory-notes`).'
  )
  process.exit(1)
}
const apply = process.argv.includes('--apply')
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// The same rule as the note field in src/lib/emotionAnalysis.ts.
const PROMPT =
  '다음 일기를 기억용 메모 한 줄(40자 안팎)로 적어. 감정이 아니라 무슨 일이 있었는지가 중심이고, ' +
  '일기에 없는 내용은 넣지 않는다. 일기를 쓴 언어로 쓰고, 메모 한 줄만 답해.'

const { data: rows, error } = await db
  .from('diaries')
  .select('id, mode, content, summary')
  .is('memory_note', null)
if (error) {
  console.error('Read failed:', error.message)
  process.exit(1)
}

// An entry's 일기: a chat entry's draft, or a written entry's 내 글.
const todo = rows
  .map((r) => ({ id: r.id, text: ((r.mode === 'chat' ? r.summary : r.content) ?? '').trim() }))
  .filter((r) => r.text)

console.log(`${rows.length} entries without a note; ${todo.length} have text to note.`)
if (!apply) {
  console.log('Dry run. Re-run with --apply to fill them (one model call each).')
  process.exit(0)
}
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY.')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, timeout: 20_000, maxRetries: 2 })
let done = 0
let failed = 0
for (const { id, text } of todo) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 80,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: text.slice(0, 4000) },
      ],
    })
    const note = res.choices[0]?.message?.content?.trim().slice(0, 120)
    if (!note) throw new Error('empty note')
    const { error: writeError } = await db
      .from('diaries')
      .update({ memory_note: note })
      .eq('id', id)
      .is('memory_note', null)
    if (writeError) throw new Error(writeError.message)
    done++
  } catch (e) {
    failed++
    console.error(`entry failed: ${e instanceof Error ? e.message : e}`)
  }
  process.stdout.write(`\r${done} filled, ${failed} failed of ${todo.length}`)
}
console.log('\nDone.')
