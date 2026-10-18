import type { DiaryEmotion } from './diary'

// A thread is the conversation attached to something. `diary` threads hang off one
// entry (Diary mode); `question` threads stand alone and read across the archive.
// See docs/PRODUCT_DIRECTION.md.
export type ThreadKind = 'diary' | 'question'

export interface Thread {
  id: string
  kind: ThreadKind
  diaryId?: string // present iff kind === 'diary'
  title: string
  /** Set when a crisis signal was detected (migration 002); no wrap-up offers after it. */
  crisisAt?: number
  createdAt: number
  updatedAt: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

// Tool results are kept apart from `content` so a generative-UI message never has to
// pretend it is text.
export type EmotionToolResult = { tool: 'emotion'; data: DiaryEmotion }

/**
 * "여기까지 일기로 정리해 둘까요?" — the AI offering wrap-up (#74). Stored as its own assistant
 * message with empty `content`: the words are UI copy, rendered from messages/<locale>.json,
 * so an offer reads in whatever language the user has, not the one it was stored in.
 */
export type WrapUpOfferToolResult = { tool: 'wrapup_offer' }

export type MessageToolResult = EmotionToolResult | WrapUpOfferToolResult

export interface Message {
  id: string
  threadId: string
  role: MessageRole
  content: string
  toolResults?: MessageToolResult[]
  createdAt: number
}
