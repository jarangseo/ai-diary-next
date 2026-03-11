export interface DiaryEmotion {
  primary: string
  score: number
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
