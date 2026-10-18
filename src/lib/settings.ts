import { supabase } from './supabase'

/**
 * Per-user settings (migration 002, `user_settings`). The app has no users table, so this
 * is the one place a user's preferences live.
 *
 * A user without a row gets the defaults, which match the behaviour before the table
 * existed: memory on, UTC, Korean. The row is created on the first visit from the browser's
 * own time zone and locale (`initSettings`), and a stored value is never overwritten by a
 * later visit — only by the user, through `updateSettings`.
 */
export interface UserSettings {
  memoryEnabled: boolean
  /** IANA time zone, e.g. `Asia/Seoul`. Every "today" is computed in it. */
  timezone: string
  /** BCP 47 tag, e.g. `ko`, `en-US`. Korean is the only UI language in v2.0. */
  locale: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  memoryEnabled: true,
  timezone: 'UTC',
  locale: 'ko',
}

interface UserSettingsRow {
  user_id: string
  memory_enabled: boolean
  timezone: string
  locale: string
}

/**
 * Postgres cannot check a zone name in a CHECK constraint, so this is the only guard.
 * `Intl` throws a RangeError for a name it does not know, which is the same list the
 * server's date arithmetic will use.
 */
export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function isValidLocale(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 35) return false
  try {
    return Intl.getCanonicalLocales(value).length === 1
  } catch {
    return false
  }
}

function rowToSettings(row: UserSettingsRow): UserSettings {
  return { memoryEnabled: row.memory_enabled, timezone: row.timezone, locale: row.locale }
}

/**
 * The user's settings, and whether they have been stored yet (so the client knows to send
 * the browser's zone once). Throws when the query fails: silently falling back to UTC
 * would move the user's "today" without anyone noticing.
 */
export async function getSettings(
  userId: string
): Promise<{ settings: UserSettings; stored: boolean }> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id, memory_enabled, timezone, locale')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`getSettings failed: ${error.message}`)

  return data
    ? { settings: rowToSettings(data), stored: true }
    : { settings: DEFAULT_SETTINGS, stored: false }
}

export type SettingsWriteResult = 'ok' | 'invalid' | 'failed'

/**
 * First visit: store the browser's zone and locale, unless a row already exists. Never
 * overwrites — a second device, or a laptop in another country, must not silently move
 * the user's day.
 */
export async function initSettings(
  userId: string,
  browser: { timezone: unknown; locale: unknown }
): Promise<SettingsWriteResult> {
  if (!isValidTimeZone(browser.timezone) || !isValidLocale(browser.locale)) return 'invalid'

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, timezone: browser.timezone, locale: browser.locale },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('initSettings failed:', error.message)
    return 'failed'
  }
  return 'ok'
}

/** The user changing a setting. Only the fields given are written; each is validated. */
export async function updateSettings(
  userId: string,
  patch: { memoryEnabled?: unknown; timezone?: unknown; locale?: unknown }
): Promise<SettingsWriteResult> {
  const row: Partial<UserSettingsRow> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (patch.memoryEnabled !== undefined) {
    if (typeof patch.memoryEnabled !== 'boolean') return 'invalid'
    row.memory_enabled = patch.memoryEnabled
  }
  if (patch.timezone !== undefined) {
    if (!isValidTimeZone(patch.timezone)) return 'invalid'
    row.timezone = patch.timezone
  }
  if (patch.locale !== undefined) {
    if (!isValidLocale(patch.locale)) return 'invalid'
    row.locale = patch.locale
  }
  if (Object.keys(row).length === 1) return 'invalid'

  // Upsert, not update: a user who changes a setting before their first-visit row exists
  // still gets it saved, with the defaults for the fields they did not touch.
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...row }, { onConflict: 'user_id' })

  if (error) {
    console.error('updateSettings failed:', error.message)
    return 'failed'
  }
  return 'ok'
}

/** For account withdrawal. Deleting a row that does not exist succeeds. */
export async function deleteSettings(userId: string): Promise<boolean> {
  const { error } = await supabase.from('user_settings').delete().eq('user_id', userId)
  if (error) console.error('deleteSettings failed:', error.message)
  return !error
}
