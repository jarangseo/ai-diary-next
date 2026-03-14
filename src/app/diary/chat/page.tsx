'use client'

import styles from './page.module.scss'
import Link from 'next/link'
import { MessageCircleIcon, PlusIcon, ChevronRightIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatListPage() {
  // TODO: const rooms = await fetch('/api/chat/rooms').then(r => r.json())
  const [rooms, setRooms] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/chat/rooms')
      .then((res) => res.json())
      .then((data) => {
        setRooms(data)
      })
      .catch((err) => {
        console.error(err)
      })
  }, [])

  const handleCreate = async () => {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today }),
    })
    const room = await res.json()
    router.push(`/diary/chat/${room.id}`)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Chat Rooms</h1>

      <button type="button" className={styles.createBtn} onClick={handleCreate}>
        <PlusIcon size={18} />
        Create New Chat Room
      </button>

      {rooms.length > 0 ? (
        <div className={styles.roomList}>
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/diary/chat/${room.id}`}
              className={styles.roomItem}
            >
              <div className={styles.roomIcon}>
                <MessageCircleIcon size={22} />
              </div>
              <div className={styles.roomInfo}>
                <div className={styles.roomDate}>{room.date}</div>
                <div className={styles.roomMeta}>
                  {room.memberCount} members · {room.lastMessage}
                </div>
              </div>
              <ChevronRightIcon size={18} className={styles.roomArrow} />
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          No chat rooms yet.
          <br />
          Create a new one to get started!
        </div>
      )}
    </div>
  )
}
