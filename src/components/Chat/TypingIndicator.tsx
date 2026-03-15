import styles from './TypingIndicator.module.scss'

interface TypingIndicatorProps {
  users: string[]
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const text =
    users.length === 1
      ? `${users[0]} is typing`
      : `${users[0]} and ${users.length - 1} others are typing`

  return (
    <div className={styles.typing}>
      <div className={styles.dots}>
        <span />
        <span />
        <span />
      </div>
      <span className={styles.text}>{text}</span>
    </div>
  )
}
