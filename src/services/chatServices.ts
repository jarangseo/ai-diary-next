import type { ChatMessage, ChatRoomData } from '@/types/chat'

const BASE_URL = '/api/chat'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export const chatApi = {
  getRooms: () => request<ChatRoomData[]>('/rooms'),
  getRoom: (roomId: string) => request<ChatRoomData>(`/rooms/${roomId}`),
  createRoom: (date: string) =>
    request<ChatRoomData>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
  joinRoom: (inviteCode: string) =>
    request<ChatRoomData>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
  getMessages: (roomId: string) =>
    request<ChatMessage[]>(`/rooms/${roomId}/messages`),
}
