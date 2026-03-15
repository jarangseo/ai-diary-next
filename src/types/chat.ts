export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'ai' | 'system'
  userName?: string
  userImage?: string
  userId: string
  createdAt: string
}

export interface OnlineUser {
  id: string
  name: string
  image?: string
  isOnline: boolean
}
