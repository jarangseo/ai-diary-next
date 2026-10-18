'use client'
import { useEffect } from 'react'
import { settingsApi } from '@/services/settingsServices'

const DONE_KEY = 'settings-init-v1'

/**
 * Sends the browser's time zone and locale once per device, so a new user's "today" is
 * their own from the first visit. The server keeps whatever is stored already, so this
 * never moves an existing user's day. The device-local flag only saves the request on
 * later visits; losing it (private window, cleared storage) just sends it once more.
 *
 * Renders nothing.
 */
export function SettingsInit() {
  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY)) return
    } catch {
      // Storage unavailable: send anyway, the server makes it harmless.
    }

    const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions()
    settingsApi
      .init(timeZone, locale)
      .then(() => {
        try {
          localStorage.setItem(DONE_KEY, '1')
        } catch {
          // Nothing to do: it will be sent once more next time.
        }
      })
      .catch(() => {
        // Not marked done, so the next visit retries.
      })
  }, [])

  return null
}
