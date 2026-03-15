import styles from './ChatMessage.module.scss'
import clsx from 'clsx'
import Image from 'next/image'
import { BotIcon } from 'lucide-react'

interface ChatMessageProps {
  content: string
  type: 'user' | 'ai' | 'system'
  userName?: string
  userImage?: string
  isMine?: boolean
  createdAt: string
}

export default function ChatMessage({
  content,
  type,
  userName,
  userImage,
  isMine,
  createdAt,
}: ChatMessageProps) {
  if (type === 'system') {
    return (
      <div className={styles.system}>
        <span>{content}</span>
      </div>
    )
  }

  const time = new Date(createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={clsx(styles.message, isMine && styles.mine)}>
      {!isMine && (
        <div className={styles.avatar}>
          {type === 'ai' ? (
            <span className={styles.aiAvatar}>
              <BotIcon size={20} />
            </span>
          ) : userImage ? (
            <Image
              src={userImage}
              alt={userName ?? ''}
              width={36}
              height={36}
              className={styles.userAvatar}
            />
          ) : (
            <span className={styles.defaultAvatar}>
              {userName?.charAt(0) ?? '?'}
            </span>
          )}
        </div>
      )}
      <div className={styles.body}>
        {!isMine && (
          <span className={styles.name}>
            {type === 'ai' ? 'AI' : userName}
          </span>
        )}
        <div className={styles.row}>
          <div
            className={clsx(
              styles.bubble,
              isMine ? styles.bubbleMine : type === 'ai' ? styles.bubbleAi : styles.bubbleOther
            )}
          >
            {content}
          </div>
          <span className={styles.time}>{time}</span>
        </div>
      </div>
    </div>
  )
}
