'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './EmotionPending.module.scss'

const ATTEMPTS = [2500, 5000]

/**
 * Bridges the gap opened by analysing after the response: an entry saved a moment ago has
 * no emotion yet, so the page re-checks instead of looking permanently empty.
 *
 * Bounded to two attempts. Analysis is best-effort — a failed one leaves the entry
 * without emotion for good — and a page that polls forever for something that will never
 * arrive is worse than one that quietly gives up.
 */
export function EmotionPending() {
  const router = useRouter()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (attempt >= ATTEMPTS.length) return

    const timer = setTimeout(() => {
      router.refresh()
      setAttempt((n) => n + 1)
    }, ATTEMPTS[attempt])

    return () => clearTimeout(timer)
  }, [attempt, router])

  if (attempt >= ATTEMPTS.length) return null

  return (
    <p className={styles.pending} role="status">
      감정을 살펴보는 중이에요…
    </p>
  )
}
