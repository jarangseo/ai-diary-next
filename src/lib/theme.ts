// Theme preference, per device. Decided: browser storage only, no database column — a
// phone at night and a desk computer by day can reasonably differ.
//
// 'system' is the absence of a choice: no stored value and no data-theme attribute, so
// themes.scss follows prefers-color-scheme. 'light' / 'dark' pin Paper / Night desk.

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const THEME_STORAGE_KEY = 'theme'

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

/** Sets or clears `data-theme` on the root element. */
export function applyThemePreference(preference: ThemePreference, root: HTMLElement): void {
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference
}

// Storage can be unavailable (private mode, blocked site data) and throws when it is;
// the theme then falls back to the system one rather than breaking the page.
export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

const listeners = new Set<() => void>()

export function writeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Not persisted, but still applied for this page view.
  }
  applyThemePreference(preference, document.documentElement)
  listeners.forEach((notify) => notify())
}

/** useSyncExternalStore subscription: this tab's writes and other tabs' (storage event). */
export function subscribeThemePreference(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
    applyThemePreference(readThemePreference(), document.documentElement)
    onChange()
  }
  listeners.add(onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Runs inline in <head>, before first paint, so a pinned theme never flashes the other
 * one while React loads. Kept tiny and dependency-free; it repeats parseThemePreference's
 * rule because it cannot import it.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`
