'use client'

import { use, useRef, useState } from 'react'
import ChatRoom from '@/components/Chat/ChatRoom'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/hooks/useSocket'
import type { ChatMessage, OnlineUser, ChatRoomData } from '@/types/chat'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  // TODO: Get roomId from params
  const { roomId } = use(params)
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const currentUserName = session?.user?.name ?? ''
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // TODO: Connect socket via useSocket hook
  const { sendMessage, emitTyping } = useSocket({
    userId: currentUserId,
    userName: currentUserName,
    roomId,
    onNewMessage: (msg) => {
      queryClient.setQueryData(['messages', roomId], (prev: ChatMessage[]) => [
        ...(prev || []),
        msg,
      ])
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    },
    onUserTyping: (userName) => {
      setTypingUsers((prev) =>
        prev.includes(userName) ? prev : [...prev, userName]
      )
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== userName))
      }, 2000)
    },
    onUserJoined: (user) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev
        return [...prev, { ...user, isOnline: true }]
      })
    },
    onUserLeft: (userId) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isOnline: false } : u))
      )
    },
    onOnlineUsers: (users) => {
      setOnlineUsers(users.map((u) => ({ ...u, isOnline: true, image: '' })))
    },
  })

  // TODO: Load existing messages via getMessages(roomId)
  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ['messages', roomId],
    queryFn: () =>
      fetch(`/api/chat/rooms/${roomId}/messages`).then((res) => res.json()),
  })

  const { data: room } = useQuery<ChatRoomData>({
    queryKey: ['room', roomId],
    queryFn: () => fetch(`/api/chat/rooms/${roomId}`).then((res) => res.json()),
  })

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)

    // TODO: socket.emit('send-message', { roomId, content: input })
    // TODO: Detect @ai mention → trigger AI response
    setInput('')
  }

  const handleInvite = async () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(
        `${window.location.origin}/diary/chat/join?code=${room?.invite_code}`
      )
      alert('Invite link copied to clipboard')
    } else {
      alert('Room not found')
    }
  }

  const handleGenerateDiary = async () => {
    if (!room) return

    const res = await fetch('/api/chat/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, date: room.date }),
    })

    if (!res.ok) {
      alert('Failed to generate diary')
      return
    }

    const data = await res.json()
    router.push(`/diary/${data.date}`)
  }

  return (
    <ChatRoom
      roomDate={room?.date ?? ''}
      messages={messages || []}
      onlineUsers={onlineUsers}
      typingUsers={typingUsers}
      inputValue={input}
      onInputChange={setInput}
      onSend={handleSend}
      onInvite={handleInvite}
      currentUserId={currentUserId}
      messagesEndRef={messagesEndRef}
      emitTyping={emitTyping}
      onGenerateDiary={handleGenerateDiary}
    />
  )
}
