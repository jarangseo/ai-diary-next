'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpIcon } from 'lucide-react'
import styles from './Home.module.scss'

/** The home's input: the first message of a new 대화로 쓰기 entry. */
export function HomeComposer() {
  const t = useTranslations('Home.input')
  const [text, setText] = useState('')

  // Nothing to send while the input is empty or only spaces.
  const canSend = text.trim().length > 0

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    // Creating the entry from this message lands in the next stage of #81.
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label className={styles.visuallyHidden} htmlFor="home-message">
        {t('label')}
      </label>
      <textarea
        id="home-message"
        className={styles.input}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('placeholder')}
      />
      <button type="submit" className={styles.send} aria-label={t('send')} disabled={!canSend}>
        <ArrowUpIcon size={18} aria-hidden />
      </button>
    </form>
  )
}
