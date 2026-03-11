import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DiaryRow {
  id: string
  user_id: string
  date: string
  content: string
  is_record_only: boolean
  emotion_primary: string | null
  emotion_score: number | null
  emotion_summary: string | null
  emotion_questions: string[] | null
  created_at: string
  updated_at: string
}
