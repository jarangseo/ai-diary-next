import { supabase } from './supabase'
import type { MessageRow, ThreadRow } from './supabase'
import type { Message, MessageToolResult, Thread } from '@/types/thread'
import { DEFAULT_SETTINGS, getSettings } from './settings'
import { startOfDayIn } from './usage'

// Server-side data access for threads and messages. Ownership is checked here rather
// than in the route: every read takes a userId, so there is no way to fetch a thread
// without saying whose it is.

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    kind: row.kind,
    diaryId: row.diary_id ?? undefined,
    title: row.title ?? '',
    crisisAt: row.crisis_at ? new Date(row.crisis_at).getTime() : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    // Stored as jsonb, so it is `unknown` until proven otherwise. A malformed value
    // drops the tool results rather than breaking the whole message.
    toolResults: Array.isArray(row.tool_results)
      ? (row.tool_results as MessageToolResult[])
      : undefined,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export async function getThread(userId: string, threadId: string): Promise<Thread | null> {
  const { data } = await supabase
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .eq('user_id', userId)
    .single()

  return data ? rowToThread(data) : null
}

export async function getThreadForDiary(userId: string, diaryId: string): Promise<Thread | null> {
  const { data } = await supabase
    .from('threads')
    .select('*')
    .eq('diary_id', diaryId)
    .eq('user_id', userId)
    .single()

  return data ? rowToThread(data) : null
}

export async function listMessages(threadId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  return data?.map(rowToMessage) ?? []
}

export async function appendMessage(
  threadId: string,
  role: Message['role'],
  content: string,
  toolResults?: MessageToolResult[]
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      tool_results: toolResults ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('appendMessage failed:', error.message)
    return null
  }

  // Sidebar ordering is by thread activity, so a new message has to move its thread.
  await supabase.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

  return rowToMessage(data)
}

/**
 * Removes messages from one thread — what a broken-off reply left behind, before `다시 시도`
 * generates it again (#115). Scoped by thread as well as id, so a stray id from elsewhere
 * cannot delete anything; the caller has already checked the thread is the user's.
 */
export async function deleteMessages(threadId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true
  const { error } = await supabase.from('messages').delete().eq('thread_id', threadId).in('id', ids)
  if (error) console.error('deleteMessages failed:', error.message)
  return !error
}

/**
 * The thread for an entry, created on first sight if it does not exist yet.
 *
 * Lazy rather than created alongside the entry, for two reasons: entries written before
 * threads existed still need one, so the lazy path has to exist regardless, and the save
 * request is already the slowest thing in the app (see TODAY_PLAN item 6) without adding
 * a write to it.
 *
 * It is a write during a page render, which is normally a smell. It is safe here because
 * `threads_diary_uniq` makes a duplicate impossible: a concurrent render loses the insert
 * and reads the winner's row instead.
 */
export async function getOrCreateThreadForDiary(
  userId: string,
  diaryId: string,
  title: string
): Promise<Thread | null> {
  const existing = await getThreadForDiary(userId, diaryId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('threads')
    .insert({ user_id: userId, diary_id: diaryId, kind: 'diary', title })
    .select('*')
    .single()

  if (error) {
    // 23505 is the unique violation: someone else created it between the read and the
    // insert, so their row is the answer.
    if (error.code === '23505') return getThreadForDiary(userId, diaryId)
    console.error('getOrCreateThreadForDiary failed:', error.message)
    return null
  }

  return rowToThread(data)
}

/**
 * How many messages the user has sent today, used as the spend guard's meter
 * (`lib/usage.ts`). Derived from the messages already stored rather than kept in a table
 * of its own: one less thing to keep in sync, and it cannot drift from what happened.
 *
 * The day is the user's own: it starts at midnight in the time zone stored in their
 * settings (`startOfDayIn`), because the over-limit notice calls it "today". A user without
 * stored settings, or a failed settings read, counts from UTC midnight, as before
 * settings existed: the guard keeps working rather than failing closed on a lookup.
 */
export async function countUserMessagesToday(userId: string): Promise<number | null> {
  let timeZone = DEFAULT_SETTINGS.timezone
  try {
    timeZone = (await getSettings(userId)).settings.timezone
  } catch (error) {
    console.error(error)
  }
  const startOfDay = startOfDayIn(timeZone)

  const { count, error } = await supabase
    .from('messages')
    .select('id, threads!inner(user_id)', { count: 'exact', head: true })
    .eq('threads.user_id', userId)
    .eq('role', 'user')
    .gte('created_at', startOfDay.toISOString())

  if (error) {
    console.error('countUserMessagesToday failed:', error.message)
    return null
  }

  return count ?? 0
}

/**
 * The first user message of each of these entries, by entry id, in **one query** (#114):
 * before wrap-up a chat entry's title is the first 30 characters of it (spec 1-1), and the
 * sidebar used to read a thread and its messages per entry.
 *
 * PostgREST has no "first row per group", so this reads the user messages of all the
 * given entries oldest first and keeps the first per entry. They are few — only entries
 * not yet wrapped up are asked for — and the row cap bounds the worst case.
 */
export async function firstUserMessages(
  userId: string,
  diaryIds: string[]
): Promise<Map<string, string>> {
  if (diaryIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('messages')
    .select('content, created_at, threads!inner(diary_id, user_id)')
    .eq('threads.user_id', userId)
    .in('threads.diary_id', diaryIds)
    .eq('role', 'user')
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) throw new Error(`firstUserMessages failed: ${error.message}`)

  // The embedded thread is one object at runtime (messages → threads is many-to-one), but
  // the inferred type says array; accept both rather than cast past it.
  const first = new Map<string, string>()
  for (const row of data) {
    const thread = Array.isArray(row.threads) ? row.threads[0] : row.threads
    const id = (thread as { diary_id?: string } | undefined)?.diary_id
    if (id && !first.has(id)) first.set(id, row.content)
  }
  return first
}
