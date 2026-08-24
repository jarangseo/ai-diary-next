import { auth } from '@/auth'
import { saveDiary, analyzeAndStoreEmotion } from '@/lib/diary'
import { countUserMessagesToday } from '@/lib/threads'
import { isOverDailyLimit } from '@/lib/usage'
import { NextResponse, after } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date, content, isRecordOnly } = await request.json()

  if (!date || !content) {
    return NextResponse.json({ error: 'date and content are required' }, { status: 400 })
  }

  const success = await saveDiary(session.user.id, date, content, isRecordOnly)

  if (!success) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Analysis runs after the response, not before it. It is a model call — several
  // seconds — and every save was waiting on it, which reads as a broken save button long
  // before it reads as thoughtful. The entry is already stored by this point; the
  // analysis only adds to it.
  //
  // The trade is that the entry lands without emotion and gains it a moment later, which
  // the detail page handles by re-checking (see EmotionPending).
  const userId = session.user.id
  after(async () => {
    // The same daily cap as the conversation: guarding only one path would move the
    // spending rather than bound it.
    const used = await countUserMessagesToday(userId)
    if (used !== null && !isOverDailyLimit(used)) {
      await analyzeAndStoreEmotion(userId, date, content)
    }
  })

  // No `emotion` in the response any more — it does not exist yet, and the only caller
  // never read it.
  return NextResponse.json({ ok: true })
}
