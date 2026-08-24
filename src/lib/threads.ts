import { supabase } from './supabase'
import type { MessageRow, ThreadRow } from './supabase'
import type { Message, MessageToolResult, Thread } from '@/types/thread'

// Server-side data access for threads and messages. Ownership is checked here rather
// than in the route: every read takes a userId, so there is no way to fetch a thread
// without saying whose it is.

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    kind: row.kind,
    diaryId: row.diary_id ?? undefined,
    title: row.title ?? '',
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
 * The day boundary is UTC. Someone near midnight in their own zone gets a window that
 * does not match their calendar — acceptable for a spend guard, wrong for anything shown
 * to a user.
 */
export async function countUserMessagesToday(userId: string): Promise<number | null> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

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
