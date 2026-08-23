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
  createdAt: number
  updatedAt: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

// Tool results are kept apart from `content` so a generative-UI message never has to
// pretend it is text. Today there is one tool; the union is the extension point.
export type MessageToolResult = { tool: 'emotion'; data: DiaryEmotion }

export interface Message {
  id: string
  threadId: string
  role: MessageRole
  content: string
  toolResults?: MessageToolResult[]
  createdAt: number
}
