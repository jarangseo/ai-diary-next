import { cache } from 'react'
import { getAllDiaries } from '@/lib/diary'
import { firstUserMessages } from '@/lib/threads'
import type { Diary } from '@/types/diary'

/**
 * Every entry of a user, read once per request: the shell's sidebar and the home page
 * both need the list, and `cache` lets them share one query.
 */
export const getEntries = cache(getAllDiaries)

/**
 * The first message of each chat entry that has no title yet, by entry id: before
 * wrap-up its title is the first 30 characters of that message (spec 1-1). One query
 * however many such entries there are (#114).
 */
export async function getFirstMessages(
  userId: string,
  entries: Diary[]
): Promise<Map<string, string>> {
  const untitled = entries.filter((d) => d.mode === 'chat' && !d.title).map((d) => d.id)
  try {
    return await firstUserMessages(userId, untitled)
  } catch (error) {
    // A missing title is not worth failing the sidebar over.
    console.error(error)
    return new Map()
  }
}
