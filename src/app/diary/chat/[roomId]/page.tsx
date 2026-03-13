'use client'

import { useRef, useState } from 'react'
import ChatRoom from '@/components/Chat/ChatRoom'

// TODO: Replace with real data
const mockMessages = [
  {
    id: '5',
    content: 'Alex has joined the room.',
    type: 'system' as const,
    userId: 'system',
    createdAt: '2026-03-11T13:59:00Z',
  },
  {
    id: '1',
    content: 'I went to that new coffee shop downtown today',
    type: 'user' as const,
    userName: 'Me',
    userId: 'me',
    createdAt: '2026-03-11T14:00:00Z',
  },
  {
    id: '2',
    content: 'Oh nice! How was it?',
    type: 'user' as const,
    userName: 'Alex',
    userImage: '',
    userId: 'friend-a',
    createdAt: '2026-03-11T14:01:00Z',
  },
  {
    id: '3',
    content: 'The latte was amazing and they had a rooftop terrace with a great view',
    type: 'user' as const,
    userName: 'Me',
    userId: 'me',
    createdAt: '2026-03-11T14:02:00Z',
  },
  {
    id: '4',
    content: 'We should all go together this weekend!',
    type: 'user' as const,
    userName: 'Alex',
    userId: 'friend-a',
    createdAt: '2026-03-11T14:03:00Z',
  },
  {
    id: '6',
    content:
      'Sounds like a lovely day exploring a new spot! A weekend trip with friends to the rooftop cafe sounds like a great plan.',
    type: 'ai' as const,
    userName: 'AI',
    userId: 'ai',
    createdAt: '2026-03-11T14:05:00Z',
  },
]

const mockOnlineUsers = [
  { id: 'me', name: 'Me', isOnline: true },
  { id: 'friend-a', name: 'Alex', isOnline: true },
  { id: 'friend-b', name: 'Sam', isOnline: false },
]

export default function ChatRoomPage() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // TODO: Get roomId from params
  // TODO: Connect socket via useSocket hook
  // TODO: Load existing messages via getMessages(roomId)
  // TODO: Manage online users and typing state via socket events

  const handleSend = () => {
    if (!input.trim()) return
    // TODO: socket.emit('send-message', { roomId, content: input })
    // TODO: Detect @ai mention → trigger AI response
    setInput('')
  }

  return (
    <ChatRoom
      roomDate="March 11, 2026"
      messages={mockMessages}
      onlineUsers={mockOnlineUsers}
      typingUsers={[]}
      inputValue={input}
      onInputChange={setInput}
      onSend={handleSend}
      onInvite={() => {
        // TODO: Copy invite link to clipboard
        // navigator.clipboard.writeText(`${origin}/api/chat/rooms/join?code=${inviteCode}`)
      }}
      currentUserId="me"
      messagesEndRef={messagesEndRef}
    />
  )
}
