'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import styles from './page.module.scss'

export default function DiaryWritePage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content, isRecordOnly: false }),
      })
      if (res.ok) {
        router.push('/diary/list')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={styles.write}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ArrowLeftIcon size={20} />
        </button>
        <input
          type="date"
          className={styles.dateInput}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving || !content.trim()}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>
      <textarea
        className={styles.content}
        placeholder="How was your day?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
    </article>
  )
}
