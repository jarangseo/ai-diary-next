'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpIcon } from 'lucide-react'
import { diaryApi } from '@/services/diaryServices'
import { canSendMessage, remainingCount, sendsOnEnter } from './composerRules'
import { stashFirstMessage } from './firstMessage'
import styles from './Home.module.scss'

// A touch screen as the main pointer: Enter is a new line there and the button sends.
const TOUCH = '(pointer: coarse)'

/** The home's input: the first message of a new 대화로 쓰기 entry. */
export function HomeComposer() {
  const t = useTranslations('Home.input')
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  const canSend = canSendMessage(text) && !sending
  const remaining = remainingCount(text)

  // The first message creates the entry, then the page moves to it. The text itself goes
  // to the entry page through sessionStorage, never the URL (see firstMessage.ts).
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!canSend) return
    setSending(true)
    setFailed(false)
    try {
      const id = await diaryApi.startChat()
      if (!stashFirstMessage(id, text.trim())) throw new Error('sessionStorage unavailable')
      router.push(`/diary/${id}`)
      // The sidebar lives in the layout, which a navigation does not re-render.
      router.refresh()
    } catch (error) {
      console.error(error)
      // What the user wrote stays in the input.
      setFailed(true)
      setSending(false)
    }
  }

  return (
    <form className={styles.composer} onSubmit={submit} aria-busy={sending || undefined}>
      <label className={styles.visuallyHidden} htmlFor="home-message">
        {t('label')}
      </label>
      <div className={styles.field}>
        <textarea
          id="home-message"
          className={styles.input}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            const touch = window.matchMedia(TOUCH).matches
            const key = { key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing }
            if (!sendsOnEnter(key, touch)) return
            // Enter never adds a line on a desktop, even when there is nothing to send.
            e.preventDefault()
            submit()
          }}
          placeholder={t('placeholder')}
          readOnly={sending}
          aria-invalid={(remaining ?? 0) < 0 || undefined}
          aria-describedby={remaining === null ? undefined : 'home-count'}
        />
        <button type="submit" className={styles.send} aria-label={t('send')} disabled={!canSend}>
          <ArrowUpIcon size={18} aria-hidden />
        </button>
      </div>
      <div className={styles.meta}>
        <span className={styles.hint}>{t('enterHint')}</span>
        {remaining !== null && (
          <span id="home-count" className={styles.count} data-over={remaining < 0 || undefined}>
            {remaining < 0
              ? t('over', { count: -remaining })
              : t('remaining', { count: remaining })}
          </span>
        )}
      </div>
      {failed && (
        <p className={styles.error} role="alert">
          {t('startFailed')}
        </p>
      )}
    </form>
  )
}
