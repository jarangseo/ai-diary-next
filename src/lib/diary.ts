import { supabase } from './supabase'
import type { DiaryEmotion } from '@/types/diary'
import { rowToDiary } from './diaryMapper'
import { analyzeEmotion } from './emotionAnalysis'

export async function getDiary(userId: string, date: string) {
  const { data } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  return data ? rowToDiary(data) : null
}

export async function getAllDiaries(userId: string) {
  const { data } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  return data?.map(rowToDiary) ?? []
}

export async function saveDiary(
  userId: string,
  date: string,
  content: string,
  isRecordOnly: boolean
) {
  const now = new Date().toISOString()

  // If an entry exists for the date, update it (preserving created_at); otherwise insert.
  // The previous upsert overwrote created_at on every save, losing the original creation time.
  const existing = await getDiary(userId, date)

  if (existing) {
    const { error } = await supabase
      .from('diaries')
      .update({ content, is_record_only: isRecordOnly, updated_at: now })
      .eq('user_id', userId)
      .eq('date', date)

    return !error
  }

  const { error } = await supabase.from('diaries').insert({
    user_id: userId,
    date,
    content,
    is_record_only: isRecordOnly,
    created_at: now,
    updated_at: now,
  })

  return !error
}

export async function deleteDiary(userId: string, date: string) {
  const { error } = await supabase
    .from('diaries')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)

  return !error
}

// Attach (or re-attach) emotion analysis to an existing diary entry.
// Targeted update of the emotion columns only — never touches `content` (analysis
// runs after a save, so the content is already correct) and leaves `updated_at`
// alone (emotion is derived metadata, not a user content edit).
export async function updateDiaryEmotion(
  userId: string,
  date: string,
  emotion: DiaryEmotion
): Promise<boolean> {
  const { error } = await supabase
    .from('diaries')
    .update({
      emotion_primary: emotion.primary,
      emotion_score: emotion.score,
      emotion_summary: emotion.summary,
      emotion_questions: emotion.questions ?? null,
    })
    .eq('user_id', userId)
    .eq('date', date)

  // Best-effort, but never silent: a swallowed DB error here made an emotion-column
  // type mismatch (numeric overflow on the 0–100 score) hard to diagnose.
  if (error) console.error('updateDiaryEmotion failed:', error.message)

  return !error
}

// Best-effort: analyze the content and, if successful, store the emotion on the
// (already-saved) entry. Both primitives swallow their own failures (analyzeEmotion
// returns null, updateDiaryEmotion returns false), so this never throws — a diary
// is always saved even if analysis or the emotion write fails. Returns the emotion
// that was stored, or null. Call AFTER the entry is saved for the given date.
export async function analyzeAndStoreEmotion(
  userId: string,
  date: string,
  content: string
): Promise<DiaryEmotion | null> {
  const emotion = await analyzeEmotion(content)
  if (emotion) await updateDiaryEmotion(userId, date, emotion)
  return emotion
}
