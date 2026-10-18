'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import styles from './page.module.scss'

function WriteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // `?id=` edits that entry; anything else writes a new one — a date can hold several
  // entries, so a date alone never means "the existing one".
  const editId = searchParams.get('id')
  const initialDate = searchParams.get('date') ?? toDateKey(new Date())

  const [date, setDate] = useState(initialDate)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  // Editing holds the form until the entry has loaded. Typing into it earlier would either
  // vanish under the prefill or — if kept — replace the whole stored body on save, and a
  // save before the date arrives would move the entry to today. A failed load keeps it held.
  const [loaded, setLoaded] = useState(!editId)

  useEffect(() => {
    if (!editId) return
    let active = true
    fetch(`/api/diary/${editId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((diary) => {
        if (!active || !diary) return
        setContent(diary.content)
        setDate(diary.date)
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [editId])

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch(editId ? `/api/diary/${editId}` : '/api/diary', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content, isRecordOnly: false }),
      })
      if (res.ok) {
        const { id } = await res.json()
        // replace (not push) so "back" from the detail skips this write page and
        // returns to wherever the user came from — the list or the calendar,
        // whichever URL is still in history.
        router.replace(`/diary/${id}`)
        // The shell's sidebar lives in the layout, which a navigation does not re-render;
        // refresh so the entry just saved appears in it.
        router.refresh()
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
          disabled={!loaded}
        />
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving || !loaded || !content.trim()}
        >
          {saving ? '저장 중…' : editId ? '수정' : '저장'}
        </button>
      </header>
      <textarea
        className={styles.content}
        placeholder="오늘 하루는 어땠나요?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={!loaded}
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
