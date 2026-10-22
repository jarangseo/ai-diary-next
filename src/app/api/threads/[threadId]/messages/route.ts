import { auth } from '@/auth'
import {
  appendMessage,
  countUserMessagesToday,
  deleteMessages,
  getThread,
  listMessages,
  markThreadCrisis,
} from '@/lib/threads'
import {
  countryFor,
  decideCrisis,
  matchesCrisisPhrase,
  moderationSignal,
  withCrisisCard,
} from '@/lib/crisis'
import { DEFAULT_SETTINGS, getSettings } from '@/lib/settings'
import { getTranslations } from 'next-intl/server'
import { getDiaryById } from '@/lib/diary'
import { shouldOfferWrapUp } from '@/lib/wrapUp'
import { planRetry } from '@/lib/messageRetry'
import { memoryFor } from '@/lib/memory'
import { cappedParts, isOverDailyLimit, DAILY_MESSAGE_LIMIT } from '@/lib/usage'
import { fakeParts } from '@/lib/fakeStream'
import { modelParts } from '@/lib/modelStream'
import { partsToNdjsonStream } from '@/lib/streamResponse'
import { MESSAGE_MAX, messageLength } from '@/components/Home/composerRules'
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

  const { text, retry } = await request.json()
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  // The input's own limit, counted the same way (by code point), so the server never
  // takes more than the UI lets anyone send.
  if (messageLength(text.trim()) > MESSAGE_MAX) {
    return NextResponse.json({ error: `text is over ${MESSAGE_MAX} characters` }, { status: 400 })
  }

  // Read before appending: the model needs the conversation so far to reply coherently,
  // and the count doubles as "is this the first exchange", which decides whether the
  // emotion card is emitted.
  const conversation = await listMessages(threadId)

  // `다시 시도` after a broken-off reply (#115): the message is already stored, so reuse it,
  // drop what the failed attempt left after it, and generate the reply again. `history` is
  // then the conversation before the message, exactly as on the first attempt.
  const plan = retry === true ? planRetry(conversation, text) : null
  if (plan?.orphanIds.length) await deleteMessages(threadId, plan.orphanIds)
  const history = plan ? conversation.slice(0, conversation.indexOf(plan.message)) : conversation
  const stored = plan ? plan.message : await appendMessage(threadId, 'user', text.trim())
  if (!stored) {
    return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
  }

  // request.signal aborts when the client calls stop() or navigates away, which ends
  // the source mid-sequence and leaves a partial assistant message — the state the UI
  // has to handle either way.
  const bench = new URL(request.url).searchParams.get('bench') === '1'

  // Whoever opens the public link spends the owner's OpenAI budget, and nothing else
  // stands between a stranger and that bill. A failed count is treated as over the limit:
  // an unreadable meter is not a reason to hand out unmetered model calls, and the
  // fallback still answers.
  const used = bench ? 0 : await countUserMessagesToday(session.user.id)
  const overLimit = used === null || isOverDailyLimit(used, DAILY_MESSAGE_LIMIT)

  // Crisis (#77): checked on every message, before the reply, so the reply itself can be
  // the careful one. The word list always runs; the model's judgement (moderation, free)
  // only where a model is called at all — not in test runs.
  const crisisNow = decideCrisis({
    phrase: matchesCrisisPhrase(text),
    moderation: bench ? null : await moderationSignal(text.trim()),
  })
  if (crisisNow && !thread.crisisAt) await markThreadCrisis(threadId)
  const inCrisis = crisisNow || Boolean(thread.crisisAt)

  // The entry this conversation is about: its date anchors memory (#128), and its mode and
  // draft decide the wrap-up offer below. A failed lookup costs both, never the reply.
  let diary: Awaited<ReturnType<typeof getDiaryById>> = null
  if (thread.kind === 'diary' && thread.diaryId) {
    try {
      diary = await getDiaryById(session.user.id, thread.diaryId)
    } catch (error) {
      console.error(error)
    }
  }

  let source
  if (bench) {
    source = fakeParts({ signal: request.signal })
  } else if (overLimit) {
    // At the limit a crisis still gets its card (below), with the fixed reply rather than
    // a model call: typing a phrase must not become a way around the spend guard.
    source = crisisNow ? (async function* () {})() : cappedParts(request.signal)
  } else {
    source = modelParts({
      history,
      text: text.trim(),
      // The user's recent entries, unless they turned memory off (#76). Never blocks.
      memory: await memoryFor(
        session.user.id,
        diary ? { id: diary.id, date: diary.date } : undefined
      ),
      withEmotion: history.length === 0,
      crisis: inCrisis,
      signal: request.signal,
    })
  }
  if (crisisNow) {
    const [t, settings] = await Promise.all([
      getTranslations('Crisis'),
      getSettings(session.user.id).then(
        (r) => r.settings,
        () => DEFAULT_SETTINGS
      ),
    ])
    source = withCrisisCard(source, countryFor(settings), t('fallbackReply'))
  }

  // Decided now, stored after the reply: the offer reads as the AI's next turn, so it has
  // to land after the reply it follows. A failed entry lookup only costs the offer —
  // the conversation never waits on it.
  const offerWrapUp =
    diary !== null &&
    shouldOfferWrapUp({
      messages: [...history, stored],
      isChatEntry: diary.mode === 'chat',
      wrappedUp: Boolean(diary.summary),
      crisis: inCrisis,
    })

  const stream = partsToNdjsonStream(source, {
    onComplete: async (content, toolResults) => {
      if (!content) return
      await appendMessage(
        threadId,
        'assistant',
        content,
        toolResults.length ? toolResults : undefined
      )
      if (offerWrapUp) {
        await appendMessage(threadId, 'assistant', '', [{ tool: 'wrapup_offer' }])
      }
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
