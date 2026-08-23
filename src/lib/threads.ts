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
