import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyThemePreference,
  parseThemePreference,
  readThemePreference,
  subscribeThemePreference,
  writeThemePreference,
} from '../theme'

const root = () => document.documentElement

beforeEach(() => {
  window.localStorage.clear()
  delete root().dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseThemePreference', () => {
  it('keeps light and dark, and treats anything else as system', () => {
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference(null)).toBe('system')
    expect(parseThemePreference('night')).toBe('system')
    expect(parseThemePreference('system')).toBe('system')
  })
})

describe('applyThemePreference', () => {
  it('pins a theme with data-theme and clears it for system', () => {
    applyThemePreference('dark', root())
    expect(root().dataset.theme).toBe('dark')
    applyThemePreference('system', root())
    expect(root().hasAttribute('data-theme')).toBe(false)
  })
})

describe('write / read', () => {
  it('persists a pinned theme in browser storage and applies it', () => {
    writeThemePreference('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readThemePreference()).toBe('dark')
    expect(root().dataset.theme).toBe('dark')
  })

  it('stores nothing for system, so the OS setting decides', () => {
    writeThemePreference('light')
    writeThemePreference('system')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(root().hasAttribute('data-theme')).toBe(false)
  })

  it('falls back to system when storage throws, and still applies the choice', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readThemePreference()).toBe('system')
    expect(() => writeThemePreference('dark')).not.toThrow()
    expect(root().dataset.theme).toBe('dark')
  })

  it('notifies subscribers of a change in this tab', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeThemePreference(onChange)
    writeThemePreference('light')
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
    writeThemePreference('dark')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('THEME_INIT_SCRIPT', () => {
  // The inline script cannot import parseThemePreference, so it is checked against it.
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['night', undefined],
    [null, undefined],
  ])('stored %s → data-theme %s', (stored, expected) => {
    if (stored !== null) window.localStorage.setItem(THEME_STORAGE_KEY, stored)
    new Function(THEME_INIT_SCRIPT)()
    expect(root().dataset.theme).toBe(expected)
  })
})
