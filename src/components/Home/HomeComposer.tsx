'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpIcon } from 'lucide-react'
import { diaryApi } from '@/services/diaryServices'
import { stashFirstMessage } from './firstMessage'
import styles from './Home.module.scss'

/** The home's input: the first message of a new 대화로 쓰기 entry. */
export function HomeComposer() {
  const t = useTranslations('Home.input')
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  // Nothing to send while the input is empty or only spaces.
  const canSend = text.trim().length > 0 && !sending

  // The first message creates the entry, then the page moves to it. The text itself goes
  // to the entry page through sessionStorage, never the URL (see firstMessage.ts).
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
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
          placeholder={t('placeholder')}
          readOnly={sending}
        />
        <button type="submit" className={styles.send} aria-label={t('send')} disabled={!canSend}>
          <ArrowUpIcon size={18} aria-hidden />
        </button>
      </div>
      {failed && (
        <p className={styles.error} role="alert">
          {t('startFailed')}
        </p>
      )}
    </form>
  )
}
