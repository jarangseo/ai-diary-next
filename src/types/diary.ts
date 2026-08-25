import type { EmotionPrimary } from '@/lib/emotion'

export interface DiaryEmotion {
  primary: EmotionPrimary
  score: number // emotional intensity, 0–100
  summary: string
  questions?: string[]
}

export interface Diary {
  /** Primary key since migration 001; `date` is an ordinary attribute now. */
  id: string
  date: string // YYYY-MM-DD
  /** Generated alongside the emotion analysis; absent on entries written before it. */
  title?: string
  content: string
  isRecordOnly: boolean
  emotion?: DiaryEmotion
  createdAt: number
  updatedAt: number
}
