import type { EmotionPrimary } from '@/lib/emotion'

export interface DiaryEmotion {
  primary: EmotionPrimary
  /** Optional second emotion (migration 002). */
  secondary?: EmotionPrimary
  score: number // emotional intensity, 0–100
  summary: string
  questions?: string[]
}

/**
 * How the entry was written (migration 002). 'chat' = 대화로 쓰기: the 일기 is the AI draft
 * in `summary` and `content` is ''. 'write' = 직접 쓰기: the 일기 is `content` (내 글).
 */
export type DiaryMode = 'chat' | 'write'

/** Who chose the emotion. A 'user' choice is never overwritten by re-analysis. */
export type EmotionSource = 'ai' | 'user'

/** A chat entry's AI draft — the 일기 — which the user may edit (`다듬기`). */
export interface DiarySummary {
  text: string
  /** When it was drafted. A thread message after this means the draft is outdated. */
  madeAt: number
  /** Set once the user edits it; `다시 정리` warns while it is set. */
  editedAt?: number
}

export interface Diary {
  /** Primary key since migration 001; `date` is an ordinary attribute now. */
  id: string
  date: string // YYYY-MM-DD
  /** Generated alongside the emotion analysis; absent on entries written before it. */
  title?: string
  mode: DiaryMode
  content: string
  /** Only on chat entries, once wrapped up. */
  summary?: DiarySummary
  isRecordOnly: boolean
  emotion?: DiaryEmotion
  emotionSource: EmotionSource
  createdAt: number
  updatedAt: number
}
