import { createClient } from '@supabase/supabase-js'

// The service-role key bypasses row-level security: this client may only ever run on the
// server. Importing it from client code should fail loudly, not quietly ship a broken client.
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase is server-only')
}

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DiaryRow {
  id: string
  user_id: string
  date: string
  title: string | null
  // Migration 002. `mode` and `emotion_source` have defaults ('write', 'ai'), so rows
  // written before it read back as written, AI-analysed entries.
  mode: 'chat' | 'write'
  content: string
  summary: string | null
  summary_made_at: string | null
  summary_edited_at: string | null
  is_record_only: boolean
  emotion_primary: string | null
  emotion_secondary: string | null
  emotion_source: 'ai' | 'user'
  emotion_score: number | null
  emotion_summary: string | null
  emotion_questions: string[] | null
  created_at: string
  updated_at: string
}

export interface ThreadRow {
  id: string
  user_id: string
  diary_id: string | null
  kind: 'diary' | 'question'
  title: string | null
  /** Migration 002: set when a crisis signal is detected; no wrap-up offers after it. */
  crisis_at: string | null
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  thread_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_results: unknown
  created_at: string
}
