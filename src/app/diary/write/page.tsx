'use client'

import { Suspense, useEffect, useState } from 'react'
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
  const [hasExisting, setHasExisting] = useState(false)
  const [saving, setSaving] = useState(false)

  // If the selected date already has an entry, load it for editing (prevents overwriting via a blank save)
  useEffect(() => {
    let active = true
    fetch(`/api/diary/${date}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((diary) => {
        if (!active) return
        setContent(diary?.content ?? '')
        setHasExisting(Boolean(diary))
      })
    return () => {
      active = false
    }
  }, [date])

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
          {saving ? '저장 중…' : hasExisting ? '수정' : '저장'}
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
