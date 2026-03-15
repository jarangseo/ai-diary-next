'use client'

import styles from './page.module.scss'
import Link from 'next/link'
import { MessageCircleIcon, PlusIcon, ChevronRightIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import type { ChatRoomData } from '@/types/chat'
import { chatApi } from '@/services/chatServices'
import toast from 'react-hot-toast'

export default function ChatListPage() {
  const { data: rooms = [] } = useQuery<ChatRoomData[]>({
    queryKey: ['rooms'],
    queryFn: () => chatApi.getRooms(),
  })

  const router = useRouter()
  const queryClient = useQueryClient()
  const createRoom = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().split('T')[0]
      return chatApi.createRoom(today)
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      router.push(`/diary/chat/${room.id}`)
    },
    onError: () => {
      toast.error('Failed to create room')
    },
  })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Chat Rooms</h1>

      <button
        type="button"
        className={styles.createBtn}
        onClick={() => createRoom.mutate()}
      >
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
                  {/* {room.memberCount} members · {room.lastMessage} */}
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
