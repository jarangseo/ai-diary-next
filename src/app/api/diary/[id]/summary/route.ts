import { auth } from '@/auth'
import { SUMMARY_MAX_LENGTH, saveEditedSummary } from '@/lib/summary'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/diary/:id/summary — `다듬기` (#83). Body: `{ text }`, the user's edit of the
 * drafted 일기. Answers `{ ok, editedAt }`.
 *
 * No model call: the emotion stays what the draft gave it, or what the user picked (#84).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { text } = await request.json().catch(() => ({}))

  if (typeof text !== 'string' || !text.trim() || text.length > SUMMARY_MAX_LENGTH) {
    return NextResponse.json(
      { error: `text is required, at most ${SUMMARY_MAX_LENGTH} characters` },
      { status: 400 }
    )
  }

  const editedAt = new Date()
  const result = await saveEditedSummary(session.user.id, id, text.trim(), editedAt)
  if (result === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (result === 'failed') {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, editedAt: editedAt.getTime() })
}
