'use client'

import { use, useEffect, useRef, useState } from 'react'
import ChatRoom from '@/components/Chat/ChatRoom'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/hooks/useSocket'
import type { ChatMessage, OnlineUser } from '@/types/chat'

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // TODO: Connect socket via useSocket hook
  const { sendMessage, emitTyping } = useSocket({
    userId: currentUserId,
    userName: currentUserName,
    roomId,
    onNewMessage: (msg) => {
      setMessages((prev) => [...prev, msg])
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
  useEffect(() => {
    const fetchMessages = async () => {
      // const messages = await getMessages(roomId)
      // setMessages(messages)

      fetch(`/api/chat/rooms/${roomId}/messages`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data)
        })
        .catch((err) => {
          console.error(err)
        })
    }
    fetchMessages()
  }, [roomId])
  // TODO: Manage online users and typing state via socket events

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    emitTyping()
    // TODO: socket.emit('send-message', { roomId, content: input })
    // TODO: Detect @ai mention → trigger AI response
    setInput('')
  }

  return (
    <ChatRoom
      roomDate="March 11, 2026"
      messages={messages}
      onlineUsers={onlineUsers}
      typingUsers={typingUsers}
      inputValue={input}
      onInputChange={setInput}
      onSend={handleSend}
      onInvite={() => {
        // TODO: Copy invite link to clipboard
        // navigator.clipboard.writeText(`${origin}/api/chat/rooms/join?code=${inviteCode}`)
      }}
      currentUserId={currentUserId}
      messagesEndRef={messagesEndRef}
    />
  )
}
