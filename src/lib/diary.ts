import { supabase } from './supabase'
import { deleteChatDataForUser } from './chat'
import type { DiaryEmotion, DiaryMode } from '@/types/diary'
import type { EmotionPrimary } from './emotion'
import { rowToDiary } from './diaryMapper'
import { analyzeEmotion, type EmotionAnalysis } from './emotionAnalysis'

// Ids are uuids. Anything else would reach Postgres as a cast error (22P02) and surface as
// a 500, so it is answered as "no such entry" before a query is made — old date-shaped
// URLs (`/diary/2026-10-10`) land here.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isDiaryId(value: string) {
  return UUID.test(value)
}

/**
 * One entry by id, or null if there is none (or it belongs to someone else). Throws when
 * the query fails, so a dead database is not mistaken for a missing entry.
 */
export async function getDiaryById(userId: string, id: string) {
  if (!isDiaryId(id)) return null

  const { data, error } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getDiaryById failed: ${error.message}`)

  return data ? rowToDiary(data) : null
}

/**
 * Every entry on a date, oldest first. Since migration 001 a date is a filter, not an
 * identity — it can hold any number of entries. Throws when the query fails.
 */
export async function listDiariesByDate(userId: string, date: string) {
  const { data, error } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`listDiariesByDate failed: ${error.message}`)

  return data.map(rowToDiary)
}

export async function getAllDiaries(userId: string) {
  const { data } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  return data?.map(rowToDiary) ?? []
}

/**
 * Always a new entry, even on a date that already has one. Returns its id, or null.
 *
 * A chat entry starts the moment its conversation does, with an empty body: its 일기 is
 * the AI draft made at wrap-up, and the user's words live in the conversation.
 */
export async function createDiary(
  userId: string,
  date: string,
  content: string,
  isRecordOnly: boolean,
  mode: DiaryMode = 'write'
): Promise<string | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('diaries')
    .insert({
      user_id: userId,
      date,
      mode,
      content: mode === 'chat' ? '' : content,
      is_record_only: isRecordOnly,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createDiary failed:', error.message)
    return null
  }

  return data.id
}

export type UpdateResult = 'updated' | 'not_found' | 'failed'

/**
 * Edits an entry's body and date, leaving `created_at` alone. An update that matches no
 * row is not an error to PostgREST, so the matched rows are read back: an id that is not
 * this user's is `not_found`, not a silent success.
 */
export async function updateDiary(
  userId: string,
  id: string,
  fields: { date: string; content: string }
): Promise<UpdateResult> {
  if (!isDiaryId(id)) return 'not_found'

  const { data, error } = await supabase
    .from('diaries')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('updateDiary failed:', error.message)
    return 'failed'
  }

  return data.length > 0 ? 'updated' : 'not_found'
}

/**
 * Removes one entry, and with it the conversation about it — the foreign keys cascade
 * from the entry to its thread and messages. Deleting an id that is already gone succeeds.
 */
export async function deleteDiary(userId: string, id: string) {
  if (!isDiaryId(id)) return true

  const { error } = await supabase.from('diaries').delete().eq('user_id', userId).eq('id', id)

  return !error
}

// Attach (or re-attach) emotion analysis to an existing diary entry.
// Targeted update of the emotion columns only — never touches `content` (analysis
// runs after a save, so the content is already correct) and leaves `updated_at`
// alone (emotion is derived metadata, not a user content edit).
//
// The user owns the emotion (PRODUCT_DIRECTION, *Emotion*): once they have picked one
// (`emotion_source = 'user'`), re-analysis refreshes the reflection — summary and
// questions — but never the emotion itself. That rule is in the WHERE clause of the
// second update rather than a read-then-write, so a pick that lands mid-analysis still
// wins.
export async function updateDiaryEmotion(
  userId: string,
  id: string,
  emotion: EmotionAnalysis
): Promise<boolean> {
  const { error: reflectionError } = await supabase
    .from('diaries')
    .update({
      emotion_summary: emotion.summary,
      emotion_questions: emotion.questions ?? null,
      // The memory note (#108) describes what happened, not how it felt, so it follows the
      // latest text like the reflection does, whoever chose the emotion.
      ...(emotion.memoryNote ? { memory_note: emotion.memoryNote } : {}),
    })
    .eq('user_id', userId)
    .eq('id', id)

  const { error: emotionError } = await supabase
    .from('diaries')
    .update({
      emotion_primary: emotion.primary,
      emotion_secondary: emotion.secondary ?? null,
      emotion_score: emotion.score,
    })
    .eq('user_id', userId)
    .eq('id', id)
    .eq('emotion_source', 'ai')

  // Best-effort, but never silent: a swallowed DB error here made an emotion-column
  // type mismatch (numeric overflow on the 0–100 score) hard to diagnose.
  const error = reflectionError ?? emotionError
  if (error) console.error('updateDiaryEmotion failed:', error.message)

  return !error
}

/**
 * The user picking the entry's emotion (the emotion chip). Marks it theirs, so
 * re-analysis leaves it alone from then on. Returns false when nothing matched or the
 * write failed.
 */
export async function setUserEmotion(
  userId: string,
  id: string,
  primary: EmotionPrimary,
  secondary?: EmotionPrimary
): Promise<boolean> {
  if (!isDiaryId(id)) return false

  const { data, error } = await supabase
    .from('diaries')
    .update({
      emotion_primary: primary,
      emotion_secondary: secondary ?? null,
      emotion_source: 'user',
    })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('setUserEmotion failed:', error.message)
    return false
  }
  return data.length > 0
}

/**
 * Stores a chat entry's 일기 from wrap-up (#75). A fresh draft is the AI's text again, so
 * any earlier edit mark is cleared; the caller has already asked the user before
 * replacing an edited draft. The AI title replaces the "first 30 characters" one.
 * Only chat entries take a draft (the CHECK in migration 002 says the same). Returns false
 * when nothing matched or the write failed.
 */
export async function saveDraft(
  userId: string,
  id: string,
  draft: { title: string; text: string },
  madeAt: Date
): Promise<boolean> {
  if (!isDiaryId(id)) return false

  const { data, error } = await supabase
    .from('diaries')
    .update({
      summary: draft.text,
      summary_made_at: madeAt.toISOString(),
      summary_edited_at: null,
      ...(draft.title ? { title: draft.title } : {}),
      updated_at: madeAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', id)
    .eq('mode', 'chat')
    .select('id')

  if (error) {
    console.error('saveDraft failed:', error.message)
    return false
  }
  return data.length > 0
}

// Best-effort: analyze the content and, if successful, store the emotion on the
// (already-saved) entry. Both primitives swallow their own failures (analyzeEmotion
// returns null, updateDiaryEmotion returns false), so this never throws — a diary
// is always saved even if analysis or the emotion write fails. Returns the emotion
// that was stored, or null. Call AFTER the entry is saved.
export async function analyzeAndStoreEmotion(
  userId: string,
  id: string,
  content: string
): Promise<DiaryEmotion | null> {
  const emotion = await analyzeEmotion(content)
  if (emotion) await updateDiaryEmotion(userId, id, emotion)
  return emotion
}

/**
 * Everything belonging to a user, for account withdrawal.
 *
 * Diaries go first: their threads and messages follow through the cascade, so there is no
 * window where a message outlives the entry it belongs to. Standalone threads — the
 * `question` kind, which has no diary — are not reachable that way and are removed after.
 * The deferred chat-room area (`lib/chat.ts`) goes last.
 *
 * Not transactional. PostgREST has no multi-statement transaction, so a failure part-way
 * leaves the rest behind. The caller is told, and a retry is safe because every delete is
 * idempotent.
 */
export async function deleteAllUserData(userId: string): Promise<boolean> {
  const { error: diaryError } = await supabase.from('diaries').delete().eq('user_id', userId)
  if (diaryError) {
    console.error('deleteAllUserData (diaries) failed:', diaryError.message)
    return false
  }

  const { error: threadError } = await supabase.from('threads').delete().eq('user_id', userId)
  if (threadError) {
    console.error('deleteAllUserData (threads) failed:', threadError.message)
    return false
  }

  // The deferred chat-room area holds conversations too; settings promises everything goes.
  return deleteChatDataForUser(userId)
}
