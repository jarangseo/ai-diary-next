'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import styles from './page.module.scss'

function WriteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialDate = searchParams.get('date') ?? toDateKey(new Date())

  const [date, setDate] = useState(initialDate)
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
        router.push(`/diary/${date}`)
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
          {saving ? '저장 중…' : '저장'}
        </button>
      </header>
      <textarea
        className={styles.content}
        placeholder="오늘 하루는 어땠나요?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
    </article>
  )
}

export default function DiaryWritePage() {
  return (
    <Suspense fallback={null}>
      <WriteForm />
    </Suspense>
  )
}
