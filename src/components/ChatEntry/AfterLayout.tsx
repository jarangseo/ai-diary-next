'use client'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquareIcon, XIcon } from 'lucide-react'
import styles from './ChatEntry.module.scss'

type Tab = 'diary' | 'chat'

interface Props {
  dateLabel: string
  /** The side panel applies (wide screen); otherwise the two are tabs. */
  wide: boolean
  /** The 일기 (`#diary-pane`). */
  diary: ReactNode
  /** The conversation, shown in the panel or the 대화 tab. */
  children: ReactNode
}

/**
 * Spec 1-2 / 1-3: the 일기 at the centre, the conversation beside it. On a wide screen the
 * toggle opens a panel and the tabs are hidden; on a narrow one the tabs switch between
 * the two and the toggle is hidden. Which applies is CSS, so the first paint is right
 * before the script knows the width. Both start on the 일기, the point of the screen.
 */
export function AfterLayout({ dateLabel, wide, diary, children }: Props) {
  // A handful of elements that change on a click: the compiler's memo cache would cost
  // more shipped JS than it saves (the bundle is near its 250 KB budget).
  'use no memo'
  const t = useTranslations('ChatEntry.after')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('diary')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const openPanel = (next: boolean) => {
    setOpen(next)
    // Focus follows: into the panel when it opens, back to its toggle when it closes.
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!next) return toggleRef.current?.focus()
      panel?.querySelector('[role="log"]')?.scrollTo({ top: 1e9 })
      panel?.querySelector<HTMLElement>('header button')?.focus()
    })
  }
  const pick = (next: Tab) => {
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <div className={styles.entry} data-wide-layout data-open={open || undefined} data-tab={tab}>
      <div className={styles.page}>
        <header className={styles.afterHeader}>
          <p className={styles.subtitle}>
            {dateLabel} · {t('kind')}
          </p>
          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls="chat-panel"
            onClick={() => openPanel(!open)}
          >
            <MessageSquareIcon size={16} aria-hidden />
            {open ? t('closeChat') : t('openChat')}
          </button>
        </header>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label={t('views')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
              pick(tab === 'diary' ? 'chat' : 'diary')
          }}
        >
          {(['diary', 'chat'] as const).map((key) => (
            <button
              key={key}
              id={`tab-${key}`}
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === key}
              aria-controls={key === 'diary' ? 'diary-pane' : 'chat-panel'}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
            >
              {t(key === 'diary' ? 'diaryTab' : 'chatTab')}
            </button>
          ))}
        </div>
        {diary}
      </div>
      <section
        ref={panelRef}
        id="chat-panel"
        className={styles.panel}
        role={wide ? undefined : 'tabpanel'}
        aria-labelledby={wide ? 'chat-panel-title' : 'tab-chat'}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && wide) openPanel(false)
        }}
      >
        <div className={styles.panelInner}>
          <header className={styles.panelHeader}>
            <h2 id="chat-panel-title" className={styles.panelTitle}>
              {t('chatTab')}
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label={t('closeChat')}
              onClick={() => openPanel(false)}
            >
              <XIcon size={18} aria-hidden />
            </button>
          </header>
          {children}
        </div>
      </section>
    </div>
  )
}
