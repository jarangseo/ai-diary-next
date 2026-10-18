import { auth } from '@/auth'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { groupEntries, todayIn, weekStartFor } from '@/lib/entryGroups'
import { getEmotionMeta } from '@/lib/emotion'
import type { Diary } from '@/types/diary'
import { getEntries, getFirstMessages } from './entries'
import { titleFromText } from './entryTitle'
import { ShellFrame, type SidebarGroup } from './ShellFrame'

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
  const firstMessages = userId ? await getFirstMessages(userId, entries) : new Map<string, string>()

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
          title:
            diary.title ||
            titleFromText(firstMessages.get(diary.id) ?? diary.content) ||
            t('untitled'),
          emotion,
          emotionLabel: emotion ? tEmotion(emotion) : undefined,
          // A chat entry not yet wrapped up: its 일기 is still to be drafted.
          unwrapped: diary.mode === 'chat' && !diary.summary,
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
