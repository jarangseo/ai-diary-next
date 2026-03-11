import { supabase } from './supabase'
import type { Diary, DiaryEmotion } from '@/types/diary'
import type { DiaryRow } from './supabase'

// Helper to convert Supabase row to Diary
function rowToDiary(row: DiaryRow): Diary {
  return {
    date: row.date,
    content: row.content,
    isRecordOnly: row.is_record_only,
    emotion: row.emotion_primary
      ? {
          primary: row.emotion_primary,
          score: row.emotion_score ?? 0,
          summary: row.emotion_summary ?? '',
          questions: row.emotion_questions ?? [],
        }
      : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

// Helper to convert Diary to Supabase row (partial)
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
  const { error } = await supabase.from('diaries').upsert(
    {
      user_id: userId,
      date,
      content,
      is_record_only: isRecordOnly,
      updated_at: now,
      created_at: now,
    },
    { onConflict: 'user_id,date' }
  )

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

// export async function updateDiaryEmotion(
//   date: string,
//   emotion: DiaryEmotion
// ): Promise<Diary | undefined> {
//   const userId = getUserId()
//   if (!supabase || !userId) return undefined

//   const diary = await getDiary(date)
//   if (!diary) return undefined

//   const updated: Diary = {
//     ...diary,
//     emotion,
//     updatedAt: Date.now(),
//   }

//   const { error } = await supabase
//     .from('diaries')
//     .upsert(diaryToRow(updated, userId), { onConflict: 'user_id,date' })

//   if (error) {
//     console.error('Failed to update emotion:', error)
//     throw error
//   }

//   return updated
// }
