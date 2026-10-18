'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signOut } from 'next-auth/react'
import {
  CalendarIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import type { EmotionPrimary } from '@/lib/emotion'
import styles from './ShellFrame.module.scss'

export interface SidebarItem {
  id: string
  title: string
  emotion?: EmotionPrimary
  /** Already translated; read by screen readers in place of the dot. */
  emotionLabel?: string
  /** A chat entry not yet wrapped up: shows the `정리 전` badge. */
  unwrapped: boolean
}

export interface SidebarGroup {
  id: string
  label: string
  items: SidebarItem[]
}

interface Props {
  groups: SidebarGroup[]
  user: { name: string; initial: string } | null
  children: React.ReactNode
}

// Matches the `mdm-lrg` breakpoint in mixins.scss: from here up the sidebar is always shown.
const WIDE = '(min-width: 768px)'
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ShellFrame({ groups, user, children }: Props) {
  const t = useTranslations('Shell')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const closerRef = useRef<HTMLButtonElement>(null)
  // Set when the user dismisses the drawer, so focus goes back to the menu button.
  const returnFocus = useRef(false)

  const dismiss = () => {
    returnFocus.current = true
    setOpen(false)
  }

  // While the drawer is open it is a modal: focus moves in, Tab stays in, Escape closes
  // and returns focus to the button that opened it. Everything behind it is `inert`.
  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current
    const opener = openerRef.current
    if (!drawer) return

    const focusables = () => Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE))
    closerRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    // Widening the window turns the drawer into the always-on sidebar.
    const wide = window.matchMedia(WIDE)
    const onWide = () => {
      if (wide.matches) setOpen(false)
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    wide.addEventListener('change', onWide)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
      wide.removeEventListener('change', onWide)
      // Runs after the closed state is committed: the header is no longer inert, so the
      // menu button can take focus again.
      if (returnFocus.current) {
        returnFocus.current = false
        opener?.focus()
      }
    }
  }, [open])

  // Following a link inside the drawer closes it; the page underneath is the destination.
  const closeOnLink = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('a[href]')) setOpen(false)
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        {t('skipToContent')}
      </a>

      <header className={styles.mobileHeader} inert={open || undefined}>
        <button
          ref={openerRef}
          type="button"
          className={styles.iconButton}
          aria-label={t('openDrawer')}
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen(true)}
        >
          <MenuIcon size={22} aria-hidden />
        </button>
        <Link className={styles.mobileLogo} href="/diary">
          {t('home')}
        </Link>
        {/* The calendar dialog arrives in v2.2; until then the control is shown, disabled. */}
        <button type="button" className={styles.iconButton} aria-label={t('calendar')} disabled>
          <CalendarIcon size={21} aria-hidden />
        </button>
      </header>

      {open && <div className={styles.backdrop} onClick={dismiss} aria-hidden />}

      <aside
        id="app-sidebar"
        ref={drawerRef}
        className={styles.sidebar}
        data-open={open || undefined}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={open ? t('entries') : undefined}
        onClick={closeOnLink}
      >
        <div className={styles.brand}>
          <Link className={styles.logo} href="/diary">
            {t('home')}
          </Link>
          <button
            ref={closerRef}
            type="button"
            className={`${styles.iconButton} ${styles.closeButton}`}
            aria-label={t('closeDrawer')}
            onClick={dismiss}
          >
            <XIcon size={20} aria-hidden />
          </button>
        </div>

        <div className={styles.actions}>
          <Link className={styles.newEntry} href="/diary">
            <PlusIcon size={18} aria-hidden className={styles.newEntryIcon} />
            {t('newEntry')}
          </Link>
          <button type="button" className={styles.action} disabled>
            <CalendarIcon size={18} aria-hidden />
            {t('calendar')}
          </button>
        </div>

        <nav className={styles.entries} aria-label={t('entries')}>
          {groups.map((group) => (
            <section key={group.id} className={styles.group} aria-labelledby={`group-${group.id}`}>
              <h2 className={styles.groupLabel} id={`group-${group.id}`}>
                {group.label}
              </h2>
              <ul className={styles.items}>
                {group.items.map((item) => {
                  const href = `/diary/${item.id}`
                  const current = pathname === href
                  return (
                    <li key={item.id}>
                      <Link
                        className={styles.item}
                        href={href}
                        aria-current={current ? 'page' : undefined}
                      >
                        <span
                          className={styles.dot}
                          data-unwrapped={item.unwrapped || undefined}
                          style={
                            {
                              '--emotion': `var(--emotion-${item.emotion ?? 'none'})`,
                            } as React.CSSProperties
                          }
                          aria-hidden
                        />
                        {item.unwrapped ? (
                          <span className={styles.visuallyHidden}>{t('unwrappedLabel')}, </span>
                        ) : (
                          item.emotionLabel && (
                            <span className={styles.visuallyHidden}>{item.emotionLabel}, </span>
                          )
                        )}
                        <span className={styles.title}>{item.title}</span>
                        {item.unwrapped && (
                          <span className={styles.badge} aria-hidden>
                            {t('unwrapped')}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </nav>

        <footer className={styles.footer}>
          {user ? (
            <>
              <Link className={styles.user} href="/settings" aria-label={t('settings')}>
                <span className={styles.avatar} aria-hidden>
                  {user.initial || <UserIcon size={16} />}
                </span>
                <span className={styles.userName}>{user.name}</span>
                <SettingsIcon size={16} aria-hidden className={styles.userSettings} />
              </Link>
              {/* Reordering and hiding entries arrive in v2.2. */}
              <button type="button" className={styles.footerButton} disabled>
                {t('editList')}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={t('signOut')}
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOutIcon size={18} aria-hidden />
              </button>
            </>
          ) : (
            <Link className={styles.user} href="/login">
              <span className={styles.avatar} aria-hidden>
                <UserIcon size={16} />
              </span>
              <span className={styles.userName}>{t('signIn')}</span>
            </Link>
          )}
        </footer>
      </aside>

      <main id="main" className={styles.main} inert={open || undefined}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  )
}
