import { auth } from '@/auth'
import { setUserEmotion } from '@/lib/diary'
import { isEmotionPrimary } from '@/lib/emotion'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/diary/:id/emotion — the user picks the entry's emotion (#84). Body:
 * `{ primary, secondary? }`, keys from `EMOTIONS`; `secondary` is optional, `null` clears it,
 * and it cannot equal `primary`.
 *
 * The choice is the user's from then on (`emotion_source = 'user'`): re-analysis at a later
 * draft or save refreshes the reflection but never the emotion. No model call.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { primary, secondary } = await request.json().catch(() => ({}))

  const validSecondary = secondary == null || (isEmotionPrimary(secondary) && secondary !== primary)
  if (!isEmotionPrimary(primary) || !validSecondary) {
    return NextResponse.json(
      { error: 'primary is required; secondary is optional and differs from it' },
      { status: 400 }
    )
  }

  if (!(await setUserEmotion(session.user.id, id, primary, secondary ?? undefined))) {
    // Not the user's, missing, or a failed write: the lib does not tell them apart.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
