'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { userId: string; message: string }[]
  >([])
  const [input, setInput] = useState('')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:4000')
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-room', 'test-room')
    })

    socket.on('new-message', (msg) => {
      console.log(msg)
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return

    socketRef.current?.emit('send-message', {
      roomId: 'test-room',
      content: input,
    })
    setInput('')
  }

  return (
    <div>
      <h1>Chat</h1>
      <div>
        {messages.map((msg, i) => (
          <p key={i}>
            <strong>{msg.userId}</strong>: {msg.message}
          </p>
        ))}
      </div>
      <div>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  )
}
