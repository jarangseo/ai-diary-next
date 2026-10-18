import { auth } from '@/auth'
import { getDiaryById, saveDraft } from '@/lib/diary'
import { draftDiary, fakeDraft } from '@/lib/diaryDraft'
import { getThreadForDiary, listMessages } from '@/lib/threads'
import { NextResponse } from 'next/server'
import { scheduleEmotionAnalysis } from '../../scheduleAnalysis'

/**
 * POST /api/diary/:id/wrap-up — `일기로 정리하기` / `다시 정리` (#75).
 *
 * Drafts the chat entry's 일기 from its conversation and stores it. Body: `{ confirm?: true }`,
 * required to replace a draft the user has edited (the UI asks "다시 정리하면 고친 부분이
 * 바뀌어요" first, and only sends confirm after a yes).
 *
 * Spend: wrap-up stays available after the daily message limit (decided — the limit card
 * offers it), so the bound is different: the model is called only when the person has
 * written something since the last draft. Drafts therefore never outnumber user messages,
 * which are capped at 20 a day.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params
  const { confirm } = await request.json().catch(() => ({}))

  let diary
  try {
    diary = await getDiaryById(userId, id)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
  if (!diary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (diary.mode !== 'chat') {
    // A written entry's 일기 is 내 글; it is never drafted.
    return NextResponse.json({ error: 'Only chat entries are wrapped up' }, { status: 400 })
  }

  const thread = await getThreadForDiary(userId, id)
  const messages = thread ? await listMessages(thread.id) : []
  const userMessages = messages.filter((m) => m.role === 'user' && m.content.trim())
  if (userMessages.length === 0) {
    return NextResponse.json({ error: 'Nothing to wrap up yet' }, { status: 400 })
  }

  if (diary.summary) {
    const madeAt = diary.summary.madeAt
    const saidSince = userMessages.some((m) => m.createdAt > madeAt)
    if (!saidSince) {
      // Nothing new to draft from: answer with what is stored, without a model call.
      return NextResponse.json({
        ok: true,
        unchanged: true,
        summary: diary.summary,
        title: diary.title,
      })
    }
    if (diary.summary.editedAt && confirm !== true) {
      return NextResponse.json(
        { error: 'The draft was edited; confirm to replace it', needsConfirm: true },
        { status: 409 }
      )
    }
  }

  // The deterministic draft in the test environment, the model everywhere else —
  // E2E_AUTH_SECRET is the same "this is a test run" gate the entry page uses.
  const draft = process.env.E2E_AUTH_SECRET ? fakeDraft(messages) : await draftDiary(messages)
  if (!draft) {
    // The 5-2 "일기로 정리하지 못했어요" state: the conversation is untouched.
    return NextResponse.json({ error: 'Could not draft' }, { status: 502 })
  }

  const madeAt = new Date()
  if (!(await saveDraft(userId, id, draft, madeAt))) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Emotion follows the 일기 (decided: analysed at each draft). It respects a user's own
  // pick (#92) and runs after the response, like a save.
  scheduleEmotionAnalysis(userId, id, draft.text)

  return NextResponse.json({
    ok: true,
    summary: { text: draft.text, madeAt: madeAt.getTime() },
    title: draft.title || diary.title,
  })
}
