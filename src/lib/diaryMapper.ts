// Pure converters between Supabase rows and the Diary domain type.
// Kept free of side effects (type-only imports, no Supabase client) so they can be
// unit-tested without env/DB. `lib/diary.ts` re-uses these for its queries.
import type { Diary } from '@/types/diary'
import type { DiaryRow } from './supabase'
import { getEmotionMeta } from './emotion'

export function rowToDiary(row: DiaryRow): Diary {
  // Only surface emotion when the stored primary is a known key; unknown/legacy
  // values fall back to undefined rather than producing a broken badge. The secondary
  // follows the same rule on its own.
  const emotionMeta = getEmotionMeta(row.emotion_primary)
  const secondaryMeta = getEmotionMeta(row.emotion_secondary)
  return {
    id: row.id,
    date: row.date,
    title: row.title ?? undefined,
    // The column defaults keep these set, but a row read through an older select or a
    // test fixture may lack them; fall back to what such a row always was.
    mode: row.mode === 'chat' ? 'chat' : 'write',
    content: row.content,
    // A draft without its timestamp cannot be told apart from an outdated one, so it is
    // not surfaced half-formed.
    summary:
      row.summary !== null && row.summary !== undefined && row.summary_made_at
        ? {
            text: row.summary,
            madeAt: new Date(row.summary_made_at).getTime(),
            editedAt: row.summary_edited_at ? new Date(row.summary_edited_at).getTime() : undefined,
          }
        : undefined,
    isRecordOnly: row.is_record_only,
    emotion: emotionMeta
      ? {
          primary: emotionMeta.key,
          secondary: secondaryMeta?.key,
          score: row.emotion_score ?? 0,
          summary: row.emotion_summary ?? '',
          questions: row.emotion_questions ?? [],
        }
      : undefined,
    emotionSource: row.emotion_source === 'user' ? 'user' : 'ai',
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
    title: diary.title ?? null,
    mode: diary.mode,
    content: diary.content,
    summary: diary.summary?.text ?? null,
    summary_made_at: diary.summary ? new Date(diary.summary.madeAt).toISOString() : null,
    summary_edited_at: diary.summary?.editedAt
      ? new Date(diary.summary.editedAt).toISOString()
      : null,
    is_record_only: diary.isRecordOnly,
    emotion_primary: diary.emotion?.primary ?? null,
    emotion_secondary: diary.emotion?.secondary ?? null,
    emotion_source: diary.emotionSource,
    emotion_score: diary.emotion?.score ?? null,
    emotion_summary: diary.emotion?.summary ?? null,
    emotion_questions: diary.emotion?.questions ?? null,
  }
}
