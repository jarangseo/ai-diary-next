'use client'

import styles from './page.module.scss'
import Link from 'next/link'
import {
  MessageCircleIcon,
  PlusIcon,
  ChevronRightIcon,
} from 'lucide-react'

// TODO: Fetch chat room list from API
const mockRooms = [
  {
    id: 'room-1',
    date: 'March 11, 2026',
    memberCount: 3,
    lastMessage: 'We should all go this weekend!',
  },
  {
    id: 'room-2',
    date: 'March 10, 2026',
    memberCount: 2,
    lastMessage: 'The weather was nice today',
  },
]

export default function ChatListPage() {
  // TODO: const rooms = await fetch('/api/chat/rooms').then(r => r.json())
  const rooms = mockRooms

  const handleCreate = () => {
    // TODO: POST /api/chat/rooms → navigate to created roomId
    // router.push(`/diary/chat/${newRoom.id}`)
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
          No chat rooms yet.<br />
          Create a new one to get started!
        </div>
      )}
    </div>
  )
}
