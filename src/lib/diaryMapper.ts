// Pure converters between Supabase rows and the Diary domain type.
// Kept free of side effects (type-only imports, no Supabase client) so they can be
// unit-tested without env/DB. `lib/diary.ts` re-uses these for its queries.
import type { Diary } from '@/types/diary'
import type { DiaryRow } from './supabase'
import { getEmotionMeta } from './emotion'

export function rowToDiary(row: DiaryRow): Diary {
  // Only surface emotion when the stored primary is a known key; unknown/legacy
  // values fall back to undefined rather than producing a broken badge.
  const emotionMeta = getEmotionMeta(row.emotion_primary)
  return {
    date: row.date,
    content: row.content,
    isRecordOnly: row.is_record_only,
    emotion: emotionMeta
      ? {
          primary: emotionMeta.key,
          score: row.emotion_score ?? 0,
          summary: row.emotion_summary ?? '',
          questions: row.emotion_questions ?? [],
        }
      : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export function diaryToRow(
  diary: Diary,
  userId: string
): Omit<DiaryRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    date: diary.date,
    content: diary.content,
    is_record_only: diary.isRecordOnly,
    emotion_primary: diary.emotion?.primary ?? null,
    emotion_score: diary.emotion?.score ?? null,
    emotion_summary: diary.emotion?.summary ?? null,
    emotion_questions: diary.emotion?.questions ?? null,
  }
}
