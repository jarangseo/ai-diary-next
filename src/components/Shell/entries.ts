import { cache } from 'react'
import { getAllDiaries } from '@/lib/diary'
import { getThreadForDiary, listMessages } from '@/lib/threads'
import type { Diary } from '@/types/diary'

/**
 * Every entry of a user, read once per request: the shell's sidebar and the home page
 * both need the list, and `cache` lets them share one query.
 */
export const getEntries = cache(getAllDiaries)

/**
 * The first message of each chat entry that has no title yet, by entry id: before
 * wrap-up its title is the first 30 characters of that message (spec 1-1).
 *
 * ⚠️ One thread read and one message read per such entry. They are few (only entries not
 * yet wrapped up) and run in parallel, but a single query for "first user message per
 * entry" in `lib/threads.ts` would replace this.
 */
export async function getFirstMessages(
  userId: string,
  entries: Diary[]
): Promise<Map<string, string>> {
  const untitled = entries.filter((d) => d.mode === 'chat' && !d.title)
  const pairs = await Promise.all(
    untitled.map(async (diary) => {
      try {
        const thread = await getThreadForDiary(userId, diary.id)
        if (!thread) return null
        const first = (await listMessages(thread.id)).find((m) => m.role === 'user')
        return first ? ([diary.id, first.content] as const) : null
      } catch (error) {
        // A missing title is not worth failing the sidebar over.
        console.error(error)
        return null
      }
    })
  )
  return new Map(pairs.filter((p) => p !== null))
}
