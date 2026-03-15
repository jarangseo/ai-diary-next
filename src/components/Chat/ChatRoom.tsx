import styles from './ChatRoom.module.scss'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import OnlineUsers from './OnlineUsers'
import { LinkIcon, CalendarIcon } from 'lucide-react'
import type { ChatMessage as Message, OnlineUser } from '@/types/chat'

interface ChatRoomProps {
  roomDate: string
  messages: Message[]
  onlineUsers: OnlineUser[]
  typingUsers: string[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  onInvite?: () => void
  currentUserId: string
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  emitTyping: () => void
}

export default function ChatRoom({
  roomDate,
  messages,
  onlineUsers,
  typingUsers,
  inputValue,
  onInputChange,
  emitTyping,
  onSend,
  onInvite,
  currentUserId,
  messagesEndRef,
}: ChatRoomProps) {
  return (
    <div className={styles.chatRoom}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <CalendarIcon size={18} className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>{roomDate}</h2>
        </div>
        <div className={styles.headerActions}>
          {onInvite && (
            <button
              type="button"
              className={styles.inviteBtn}
              onClick={onInvite}
              aria-label="Copy invite link"
            >
              <LinkIcon size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Online Users */}
      <OnlineUsers users={onlineUsers} />

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            content={msg.content}
            type={msg.type}
            userName={msg.userName}
            userImage={msg.userImage}
            isMine={msg.userId === currentUserId}
            createdAt={msg.createdAt}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing + Input */}
      <TypingIndicator users={typingUsers} />
      <ChatInput
        value={inputValue}
        onChange={(value) => {
          onInputChange(value)
          emitTyping()
        }}
        onSend={onSend}
      />
    </div>
  )
}
