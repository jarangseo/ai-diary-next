import { useCallback, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ChatMessage } from '@/types/chat'

export function useSocket({
  userId,
  userName,
  roomId,
  onNewMessage,
  onUserTyping,
  onUserJoined,
  onUserLeft,
  onOnlineUsers,
}: {
  userId: string
  userName: string
  roomId: string
  onNewMessage: (message: ChatMessage) => void
  onUserTyping: (userId: string) => void
  onUserJoined: (user: { id: string; name: string }) => void
  onUserLeft: (userId: string) => void
  onOnlineUsers: (users: { id: string; name: string }[]) => void
}) {
  const socketRef = useRef<Socket | null>(null)
  const callbacksRef = useRef({
    onNewMessage,
    onUserTyping,
    onUserJoined,
    onUserLeft,
    onOnlineUsers,
  })
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onUserTyping,
      onUserJoined,
      onUserLeft,
      onOnlineUsers,
    }
  })

  useEffect(() => {
    const socket: Socket = io('http://localhost:4000', {
      auth: { userId, userName },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-room', roomId)
    })

    socket.on('new-message', (msg) => callbacksRef.current.onNewMessage(msg))
    socket.on('user-typing', (id) => callbacksRef.current.onUserTyping(id))
    socket.on('user-joined', (u) => callbacksRef.current.onUserJoined(u))
    socket.on('user-left', (id) => callbacksRef.current.onUserLeft(id))
    socket.on('online-users', (u) => callbacksRef.current.onOnlineUsers(u))

    socket.on('disconnect', () => {
      console.log('disconnected')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, userName, roomId])

  const sendMessage = useCallback(
    (content: string) => {
      socketRef.current?.emit('send-message', { roomId, content })
    },
    [roomId]
  )

  const emitTyping = useCallback(() => {
    socketRef.current?.emit('user-typing', { roomId, userId })
  }, [roomId, userId])

  return { sendMessage, emitTyping }
}
