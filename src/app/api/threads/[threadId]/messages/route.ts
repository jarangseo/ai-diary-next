import { auth } from '@/auth'
import { appendMessage, getThread } from '@/lib/threads'
import { fakeParts } from '@/lib/fakeStream'
import { partsToNdjsonStream } from '@/lib/streamResponse'
import { NextResponse } from 'next/server'

// POST /api/threads/:threadId/messages
//
// Stores the user's message, then streams the assistant's reply as NDJSON.
//
// The request carries only the new text — never the whole conversation. History lives
// in the `messages` table, so a reload keeps the thread, the payload stays flat as the
// conversation grows, and the server stays the single source of truth for what was said.
//
// `?bench=1` swaps the model for the deterministic fake stream. Every number in
// docs/PERFORMANCE.md comes from that path: a live model varies in length and pace, so
// before/after comparisons against one measure the weather, not the code.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { threadId } = await params

  // Scoped by user, so an id belonging to someone else is indistinguishable from one
  // that does not exist.
  const thread = await getThread(session.user.id, threadId)
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const { text } = await request.json()
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const stored = await appendMessage(threadId, 'user', text.trim())
  if (!stored) {
    return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
  }

  // request.signal aborts when the client calls stop() or navigates away, which ends
  // the source mid-sequence and leaves a partial assistant message — the state the UI
  // has to handle either way.
  const source = fakeParts({ signal: request.signal })

  const stream = partsToNdjsonStream(source, {
    onComplete: async (content, toolResults) => {
      if (!content) return
      await appendMessage(threadId, 'assistant', content, toolResults.length ? toolResults : undefined)
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      // Proxies that buffer would defeat the point of streaming.
      'x-accel-buffering': 'no',
    },
  })
}
