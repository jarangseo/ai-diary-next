import { auth } from '@/auth'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { groupEntries, todayIn, weekStartFor } from '@/lib/entryGroups'
import { getEmotionMeta } from '@/lib/emotion'
import type { Diary } from '@/types/diary'
import { getEntries } from './entries'
import { ShellFrame, type SidebarGroup } from './ShellFrame'

// The spec's title before wrap-up: the first 30 characters of what was written.
const TITLE_LENGTH = 30

function fallbackTitle(content: string): string {
  const firstLine = content.trim().split('\n', 1)[0].trim()
  // By code point, so an emoji or a combining mark is never cut in half.
  return Array.from(firstLine).slice(0, TITLE_LENGTH).join('')
}

/** The settings, or the defaults if they cannot be read: a sidebar grouped in UTC beats no app. */
async function readSettings(userId: string) {
  try {
    return (await getSettings(userId)).settings
  } catch (error) {
    console.error('AppShell: settings unavailable, grouping in UTC.', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * The v2 shell: a sidebar of entries beside the page on wide screens, a header with a
 * drawer on narrow ones. Reads the entries and the user's settings on the server, groups
 * them in the user's time zone and hands the client only the strings it renders.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const userId = session?.user?.id

  const [entries, settings, t, tEmotion, locale] = await Promise.all([
    userId ? getEntries(userId) : Promise.resolve([] as Diary[]),
    userId ? readSettings(userId) : Promise.resolve(DEFAULT_SETTINGS),
    getTranslations('Shell'),
    getTranslations('Emotion'),
    getLocale(),
  ])

  const monthFormat = (withYear: boolean) =>
    new Intl.DateTimeFormat(locale, {
      year: withYear ? 'numeric' : undefined,
      month: 'long',
      timeZone: 'UTC',
    })
  const now = new Date()
  // A month of the current year is named without the year, the way the canvas does.
  const thisYear = Number(todayIn(now, settings.timezone).slice(0, 4))

  const groups: SidebarGroup[] = groupEntries(entries, {
    now,
    timeZone: settings.timezone,
    weekStartsOn: weekStartFor(settings.locale),
  }).map((group) => {
    let label: string
    if (group.key === 'month') {
      const [y, m] = group.month!.split('-').map(Number)
      label = monthFormat(y !== thisYear).format(new Date(Date.UTC(y, m - 1, 1)))
    } else {
      label = t(`groups.${group.key}`)
    }
    return {
      id: group.month ?? group.key,
      label,
      items: group.items.map((diary) => {
        const emotion = getEmotionMeta(diary.emotion?.primary)?.key
        return {
          id: diary.id,
          title: diary.title || fallbackTitle(diary.content) || t('untitled'),
          emotion,
          emotionLabel: emotion ? tEmotion(emotion) : undefined,
          // A chat entry not yet wrapped up. Entries carry no such state until the
          // conversation mode lands (#73), so nothing is unwrapped today.
          unwrapped: false,
        }
      }),
    }
  })

  const name = session?.user?.name ?? ''
  const user = userId ? { name, initial: Array.from(name)[0] ?? '' } : null

  return (
    <ShellFrame groups={groups} user={user}>
      {children}
    </ShellFrame>
  )
}
