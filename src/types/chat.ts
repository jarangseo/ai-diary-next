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

export interface ChatRoomData {
  id: string
  owner_id: string
  date: string
  invite_code: string
  created_at: string
}
