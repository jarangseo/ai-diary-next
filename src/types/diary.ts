import type { EmotionPrimary } from '@/lib/emotion'

export interface DiaryEmotion {
  primary: EmotionPrimary
  score: number // emotional intensity, 0–100
  summary: string
  questions?: string[]
}

export interface Diary {
  date: string // YYYY-MM-DD format (primary key)
  content: string
  isRecordOnly: boolean
  emotion?: DiaryEmotion
  createdAt: number
  updatedAt: number
}
