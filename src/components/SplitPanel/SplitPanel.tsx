'use client'

import { useState, useCallback } from 'react'
import styles from './SplitPanel.module.scss'

export default function SplitPanel({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  const [leftWidth, setLeftWidth] = useState(50)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setLeftWidth((w) => Math.max(w - 2, 20))
    if (e.key === 'ArrowRight') setLeftWidth((w) => Math.min(w + 2, 80))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const container = target.parentElement
    if (!container) return
    const rect = container.getBoundingClientRect()

    document.body.style.userSelect = 'none'

    const handlePointerMove = (e: PointerEvent) => {
      const newLeft = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(Math.max(newLeft, 20), 80))
    }

    const handlePointerUp = () => {
      document.body.style.userSelect = ''
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }, [])

  return (
    <div className={styles.split}>
      <div className={styles.left} style={{ width: `${leftWidth}%` }}>
        {left}
      </div>
      <div
        className={styles.divider}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftWidth)}
        aria-valuemin={20}
        aria-valuemax={80}
        aria-label="Resize panels"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.right} style={{ width: `${100 - leftWidth}%` }}>
        {right}
      </div>
    </div>
  )
}
