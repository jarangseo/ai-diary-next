import styles from './ChatInput.module.scss'
import { SendIcon } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className={styles.inputWrap}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (mention @ai to call AI)"
        rows={1}
        disabled={disabled}
      />
      <button
        type="button"
        className={styles.sendBtn}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        <SendIcon size={20} />
      </button>
    </div>
  )
}
